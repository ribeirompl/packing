import { PACK_PHASES, TRIP_TAGS } from '@/types';
import type { ChecklistSnapshot, PackPhase, Result, TripTag } from '@/types';

/**
 * Share links: a checklist snapshot packed into the URL itself (no server).
 *
 * Payload (version 1), as JSON before compression:
 *   { v: 1, t: title, s: start, e: end, g?: [tag index], k?: 1, c: [category name], i: [item] }
 * Each item is [name, categoryIndex, quantity?, phaseIndex?, checked?] with trailing defaults
 * (quantity 1, phase 0 = 'ahead', unchecked) dropped. `k: 1` means packed status is included.
 * The JSON is compressed with deflate-raw and encoded as unpadded base64url.
 *
 * Anyone can craft a link, so decoding treats the payload as untrusted and validates it strictly.
 */

export const SHARE_VERSION = 1;

export const SHARE_LIMITS = {
  /** Max length of the encoded `d` parameter */
  maxEncodedLength: 100_000,
  /** Max decompressed JSON size, guards against decompression bombs */
  maxDecodedBytes: 256 * 1024,
  maxTitleLength: 100,
  maxNameLength: 100,
  maxItems: 500,
  maxQuantity: 999,
} as const;

type EncodedItem = [string, number, number?, number?, (0 | 1)?];

interface Payload {
  v: number;
  t: string;
  s: string;
  e: string;
  g?: number[];
  k?: 1;
  c: string[];
  i: EncodedItem[];
}

const CORRUPT_MESSAGE =
  'This share link is incomplete or corrupted. Ask for the link to be sent again.';
const INVALID_MESSAGE = 'This share link contains invalid checklist data.';

class ShareLinkError extends Error {}

function invalid(detail?: string): never {
  throw new ShareLinkError(detail ? `${INVALID_MESSAGE} (${detail})` : INVALID_MESSAGE);
}

// --- Compression ------------------------------------------------------------

export function isShareSupported(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

/** Run bytes through a (de)compression stream, aborting once the output exceeds `maxBytes`. */
async function transform(
  input: Uint8Array,
  stream: CompressionStream | DecompressionStream,
  maxBytes = Infinity
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  // Errors surface through the reader; swallow them here to avoid unhandled rejections
  const writing = writer
    .write(input as Uint8Array<ArrayBuffer>)
    .then(() => writer.close())
    .catch(() => {});

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new ShareLinkError('This share link is too large to open.');
    }
    chunks.push(value);
  }
  await writing;

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

// --- base64url --------------------------------------------------------------

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(data: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(data) || data.length % 4 === 1) {
    throw new ShareLinkError(CORRUPT_MESSAGE);
  }
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// --- Validation helpers -----------------------------------------------------

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function isIndex(value: unknown, length: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < length;
}

function cleanString(value: unknown, maxLength: number, field: string, allowEmpty = false): string {
  if (typeof value !== 'string') invalid(`${field} is not text`);
  const trimmed = value.trim();
  if (!allowEmpty && trimmed.length === 0) invalid(`${field} is empty`);
  if (trimmed.length > maxLength) invalid(`${field} is longer than ${maxLength} characters`);
  return trimmed;
}

/** Shorten over-long names on the way out so our own links always pass validation. */
function clip(value: string, maxLength: number): string {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength).trim() : trimmed;
}

// --- Encode -----------------------------------------------------------------

function toPayload(snapshot: ChecklistSnapshot): Payload {
  if (snapshot.items.length > SHARE_LIMITS.maxItems) {
    throw new Error(
      `This checklist has too many items to share (maximum ${SHARE_LIMITS.maxItems}).`
    );
  }
  if (!isValidDate(snapshot.start_date) || !isValidDate(snapshot.end_date)) {
    throw new Error('This checklist has invalid trip dates and cannot be shared.');
  }

  const includeChecked = snapshot.items.some((item) => item.checked !== undefined);
  const categories: string[] = [];
  const categoryIndex = new Map<string, number>();

  const items = snapshot.items.map((item): EncodedItem => {
    const categoryName = clip(item.category_name, SHARE_LIMITS.maxNameLength) || 'Other';
    let ci = categoryIndex.get(categoryName);
    if (ci === undefined) {
      ci = categories.push(categoryName) - 1;
      categoryIndex.set(categoryName, ci);
    }
    const quantity = Math.min(
      SHARE_LIMITS.maxQuantity,
      Math.max(1, Math.round(item.quantity) || 1)
    );
    const phase = Math.max(0, PACK_PHASES.indexOf(item.phase));
    const encoded: EncodedItem = [
      clip(item.name, SHARE_LIMITS.maxNameLength) || 'Item',
      ci,
      quantity,
      phase,
      item.checked ? 1 : 0,
    ];
    // Drop trailing defaults: unchecked, phase 'ahead', quantity 1
    const defaults = [undefined, undefined, 1, 0, 0];
    while (encoded.length > 2 && encoded[encoded.length - 1] === defaults[encoded.length - 1]) {
      encoded.pop();
    }
    return encoded;
  });

  const tags = [...new Set(snapshot.tags)]
    .map((tag) => TRIP_TAGS.indexOf(tag))
    .filter((index) => index >= 0);

  return {
    v: SHARE_VERSION,
    t: clip(snapshot.title, SHARE_LIMITS.maxTitleLength),
    s: snapshot.start_date,
    e: snapshot.end_date,
    ...(tags.length > 0 && { g: tags }),
    ...(includeChecked && { k: 1 as const }),
    c: categories,
    i: items,
  };
}

/** Compress a snapshot into a URL-safe string. Throws if it can't be shared. */
export async function encodeSnapshot(snapshot: ChecklistSnapshot): Promise<string> {
  if (!isShareSupported()) {
    throw new Error('Sharing is not supported in this browser.');
  }
  const json = JSON.stringify(toPayload(snapshot));
  const compressed = await transform(
    new TextEncoder().encode(json),
    new CompressionStream('deflate-raw')
  );
  return toBase64Url(compressed);
}

/** Full share link, e.g. https://host/app/#/import?d=... */
export async function buildShareUrl(
  snapshot: ChecklistSnapshot,
  baseUrl: string = location.origin + location.pathname
): Promise<string> {
  return `${baseUrl}#/import?d=${await encodeSnapshot(snapshot)}`;
}

// --- Decode -----------------------------------------------------------------

function fromPayload(raw: unknown): ChecklistSnapshot {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) invalid();
  const payload = raw as Record<string, unknown>;

  if (payload.v !== SHARE_VERSION) {
    if (typeof payload.v === 'number' && payload.v > SHARE_VERSION) {
      throw new ShareLinkError(
        'This share link was made with a newer version of the app. Reload the app to update it, then open the link again.'
      );
    }
    invalid('unknown format');
  }

  const title = cleanString(payload.t ?? '', SHARE_LIMITS.maxTitleLength, 'title', true);

  if (!isValidDate(payload.s) || !isValidDate(payload.e)) invalid('bad trip dates');
  const startDate = payload.s as string;
  const endDate = payload.e as string;
  if (startDate > endDate) invalid('trip ends before it starts');

  // Unknown tags (e.g. from a newer app version) are ignored rather than rejected
  let tags: TripTag[] = [];
  if (payload.g !== undefined) {
    if (!Array.isArray(payload.g) || payload.g.length > TRIP_TAGS.length * 4) invalid('bad tags');
    tags = [
      ...new Set(
        payload.g.filter((g) => isIndex(g, TRIP_TAGS.length)).map((g) => TRIP_TAGS[g as number]!)
      ),
    ];
  }

  if (payload.k !== undefined && payload.k !== 1) invalid('bad packed flag');
  const includeChecked = payload.k === 1;

  if (!Array.isArray(payload.c) || payload.c.length > SHARE_LIMITS.maxItems) {
    invalid('bad categories');
  }
  const categories = payload.c.map((c) => cleanString(c, SHARE_LIMITS.maxNameLength, 'category'));

  if (!Array.isArray(payload.i)) invalid('missing items');
  if (payload.i.length === 0) invalid('the checklist has no items');
  if (payload.i.length > SHARE_LIMITS.maxItems) {
    invalid(`more than ${SHARE_LIMITS.maxItems} items`);
  }

  const items = payload.i.map((entry, index) => {
    const n = index + 1;
    if (!Array.isArray(entry) || entry.length < 2 || entry.length > 5) invalid(`item ${n}`);
    const [name, ci, quantity = 1, phase = 0, checked = 0] = entry as unknown[];
    if (!isIndex(ci, categories.length)) invalid(`item ${n} has an unknown category`);
    if (
      !Number.isInteger(quantity) ||
      (quantity as number) < 1 ||
      (quantity as number) > SHARE_LIMITS.maxQuantity
    ) {
      invalid(`item ${n} has an invalid quantity`);
    }
    if (!isIndex(phase, PACK_PHASES.length)) invalid(`item ${n} has an invalid phase`);
    if (checked !== 0 && checked !== 1) invalid(`item ${n} has an invalid packed status`);
    if (!includeChecked && checked === 1) invalid(`item ${n} has an unexpected packed status`);

    return {
      name: cleanString(name, SHARE_LIMITS.maxNameLength, `item ${n} name`),
      category_name: categories[ci as number]!,
      quantity: quantity as number,
      phase: PACK_PHASES[phase as number] as PackPhase,
      ...(includeChecked && { checked: checked === 1 }),
    };
  });

  return { title, start_date: startDate, end_date: endDate, tags, items };
}

/** Decode and validate the `d` parameter of a share link. */
export async function decodeSnapshot(data: string): Promise<Result<ChecklistSnapshot, Error>> {
  try {
    if (typeof data !== 'string' || data.length === 0) {
      throw new ShareLinkError('This share link is missing its checklist data.');
    }
    if (data.length > SHARE_LIMITS.maxEncodedLength) {
      throw new ShareLinkError('This share link is too large to open.');
    }
    if (!isShareSupported()) {
      throw new ShareLinkError(
        'This browser cannot open share links. Try a recent version of Chrome, Edge, Firefox or Safari.'
      );
    }

    const bytes = fromBase64Url(data);
    let json: string;
    try {
      const decompressed = await transform(
        bytes,
        new DecompressionStream('deflate-raw'),
        SHARE_LIMITS.maxDecodedBytes
      );
      json = new TextDecoder('utf-8', { fatal: true }).decode(decompressed);
    } catch (error) {
      if (error instanceof ShareLinkError) throw error;
      throw new ShareLinkError(CORRUPT_MESSAGE);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch {
      throw new ShareLinkError(CORRUPT_MESSAGE);
    }

    return { success: true, data: fromPayload(raw) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof ShareLinkError ? error : new Error(CORRUPT_MESSAGE),
    };
  }
}
