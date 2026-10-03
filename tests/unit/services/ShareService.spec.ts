import { describe, it, expect } from 'vitest';
import {
  buildShareUrl,
  decodeSnapshot,
  encodeSnapshot,
  SHARE_LIMITS,
} from '../../../src/services/ShareService';
import type { ChecklistSnapshot, PackPhase } from '../../../src/types';

const base: ChecklistSnapshot = {
  title: 'Lisbon trip',
  start_date: '2026-06-01',
  end_date: '2026-06-07',
  tags: ['flying', 'hot', 'beach'],
  items: [
    { name: 'T-shirts', category_name: 'Clothes', quantity: 7, phase: 'ahead' },
    { name: 'Phone charger', category_name: 'Electronics', quantity: 1, phase: 'last_minute' },
    { name: 'Lock the door', category_name: 'House', quantity: 1, phase: 'leaving' },
    { name: 'Socks', category_name: 'Clothes', quantity: 8, phase: 'ahead' },
  ],
};

/** Run bytes through a browser (de)compression stream */
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const writer = stream.writable.getWriter();
  void writer.write(bytes as Uint8Array<ArrayBuffer>).then(() => writer.close());
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

/** Compress an arbitrary JSON value the same way the service does, to craft hostile links */
async function craft(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value));
  const compressed = await pipe(bytes, new CompressionStream('deflate-raw'));
  let binary = '';
  for (const b of compressed) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const validPayload = () => ({
  v: 1,
  t: 'Trip',
  s: '2026-06-01',
  e: '2026-06-03',
  c: ['Clothes'],
  i: [['Shirt', 0, 2]],
});

async function expectRejected(data: string, message?: RegExp) {
  const result = await decodeSnapshot(data);
  expect(result.success).toBe(false);
  if (!result.success && message) expect(result.error.message).toMatch(message);
}

function makeItems(count: number): ChecklistSnapshot['items'] {
  const categories = ['Clothes', 'Toiletries', 'Electronics', 'Documents', 'Health', 'Misc'];
  const phases: PackPhase[] = ['ahead', 'ahead', 'ahead', 'last_minute', 'leaving'];
  const words = ['Travel', 'Spare', 'Small', 'Warm', 'Light', 'Rain', 'Sun', 'Phone', 'Hair'];
  const nouns = ['jacket', 'charger', 'towel', 'socks', 'brush', 'adapter', 'hat', 'bag', 'kit'];
  return Array.from({ length: count }, (_, i) => ({
    name: `${words[i % words.length]} ${nouns[(i * 7) % nouns.length]} ${i}`,
    category_name: categories[i % categories.length]!,
    quantity: i % 4 === 0 ? (i % 9) + 2 : 1,
    phase: phases[i % phases.length]!,
  }));
}

describe('ShareService', () => {
  describe('round trip', () => {
    it('restores the snapshot exactly', async () => {
      const result = await decodeSnapshot(await encodeSnapshot(base));
      expect(result).toEqual({ success: true, data: base });
    });

    it('preserves unicode, custom categories and packed status', async () => {
      const snapshot: ChecklistSnapshot = {
        title: 'Viagem a São Paulo 🇧🇷',
        start_date: '2026-12-30',
        end_date: '2027-01-02',
        tags: [],
        items: [
          {
            name: 'Protetor solar ☀️',
            category_name: 'Praia 🏖️',
            quantity: 1,
            phase: 'ahead',
            checked: true,
          },
          {
            name: '充电器',
            category_name: 'Электроника',
            quantity: 999,
            phase: 'leaving',
            checked: false,
          },
          {
            name: 'Crème "spéciale" <b>',
            category_name: 'Praia 🏖️',
            quantity: 3,
            phase: 'last_minute',
            checked: true,
          },
        ],
      };
      const result = await decodeSnapshot(await encodeSnapshot(snapshot));
      expect(result).toEqual({ success: true, data: snapshot });
    });

    it('omits packed status when not included', async () => {
      const result = await decodeSnapshot(await encodeSnapshot(base));
      expect(result.success && result.data.items.every((i) => !('checked' in i))).toBe(true);
    });

    it('builds a hash-route import URL with a URL-safe payload', async () => {
      const url = await buildShareUrl(base, 'https://example.com/packing/');
      const match = /^https:\/\/example\.com\/packing\/#\/import\?d=([A-Za-z0-9_-]+)$/.exec(url);
      expect(match).not.toBeNull();
      expect((await decodeSnapshot(match![1]!)).success).toBe(true);
    });

    it('clips over-long names and clamps quantities so its own links always decode', async () => {
      const snapshot: ChecklistSnapshot = {
        ...base,
        title: 'T'.repeat(300),
        items: [{ name: 'N'.repeat(300), category_name: 'C', quantity: 5000, phase: 'ahead' }],
      };
      const result = await decodeSnapshot(await encodeSnapshot(snapshot));
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.title).toHaveLength(SHARE_LIMITS.maxTitleLength);
      expect(result.data.items[0]!.name).toHaveLength(SHARE_LIMITS.maxNameLength);
      expect(result.data.items[0]!.quantity).toBe(SHARE_LIMITS.maxQuantity);
    });

    it('refuses to encode more than the item limit', async () => {
      await expect(
        encodeSnapshot({ ...base, items: makeItems(SHARE_LIMITS.maxItems + 1) })
      ).rejects.toThrow(/too many items/);
    });
  });

  describe('compactness', () => {
    it('keeps a typical 60-item list well under 2,000 characters', async () => {
      const snapshot = { ...base, items: makeItems(60) };
      const encoded = await encodeSnapshot(snapshot);
      const naive = btoa(unescape(encodeURIComponent(JSON.stringify(snapshot))));
      expect(encoded.length).toBeLessThan(2000);
      expect(encoded.length).toBeLessThan(naive.length / 3);
    });

    it('drops default fields from items', async () => {
      const encoded = await encodeSnapshot({
        ...base,
        tags: [],
        items: [{ name: 'A', category_name: 'B', quantity: 1, phase: 'ahead' }],
      });
      // Decompress with the browser API to peek at the raw payload
      const bytes = Uint8Array.from(
        atob(
          encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (encoded.length % 4)) % 4)
        ),
        (c) => c.charCodeAt(0)
      );
      const raw = await pipe(bytes, new DecompressionStream('deflate-raw'));
      const json = JSON.parse(new TextDecoder().decode(raw));
      expect(json).toEqual({
        v: 1,
        t: 'Lisbon trip',
        s: '2026-06-01',
        e: '2026-06-07',
        c: ['B'],
        i: [['A', 0]],
      });
    });
  });

  describe('rejects malformed input', () => {
    it('accepts the crafted baseline payload', async () => {
      const result = await decodeSnapshot(await craft(validPayload()));
      expect(result.success).toBe(true);
    });

    it('rejects empty and non-base64url data', async () => {
      await expectRejected('', /missing/);
      await expectRejected('abc$%^', /corrupted/);
      await expectRejected('a', /corrupted/);
      await expectRejected('abc+/=', /corrupted/);
    });

    it('rejects data that is not deflate, not UTF-8 or not JSON', async () => {
      await expectRejected('SGVsbG8gd29ybGQ', /corrupted/);
      const truncated = await craft(validPayload());
      await expectRejected(truncated.slice(0, truncated.length - 8), /corrupted/);
      await expectRejected(await craft('{not json'), /corrupted/);
      await expectRejected(await craft('[1,2,3]'), /invalid/);
      await expectRejected(await craft('null'), /invalid/);
    });

    it('rejects unknown and newer versions', async () => {
      await expectRejected(await craft({ ...validPayload(), v: 2 }), /newer version/);
      await expectRejected(await craft({ ...validPayload(), v: 0 }), /invalid/);
      await expectRejected(await craft({ ...validPayload(), v: '1' }), /invalid/);
    });

    it('rejects oversized links and decompression bombs', async () => {
      await expectRejected('A'.repeat(SHARE_LIMITS.maxEncodedLength + 1), /too large/);
      const bomb = await craft({ ...validPayload(), t: ' '.repeat(SHARE_LIMITS.maxDecodedBytes) });
      expect(bomb.length).toBeLessThan(2000);
      await expectRejected(bomb, /too large/);
    });

    it('rejects bad dates', async () => {
      for (const [s, e] of [
        ['2026-02-30', '2026-03-01'],
        ['2026-6-1', '2026-06-03'],
        ['2026-06-01T00:00', '2026-06-03'],
        ['2026-06-05', '2026-06-01'],
        [20260601, '2026-06-03'],
      ]) {
        await expectRejected(await craft({ ...validPayload(), s, e }), /invalid/);
      }
    });

    it('rejects out-of-range category and phase indexes', async () => {
      await expectRejected(await craft({ ...validPayload(), i: [['Shirt', 1]] }), /category/);
      await expectRejected(await craft({ ...validPayload(), i: [['Shirt', -1]] }), /category/);
      await expectRejected(await craft({ ...validPayload(), i: [['Shirt', 0, 1, 3]] }), /phase/);
      await expectRejected(await craft({ ...validPayload(), i: [['Shirt', 0, 1, 0.5]] }), /phase/);
    });

    it('ignores unknown tag indexes instead of failing', async () => {
      const result = await decodeSnapshot(
        await craft({ ...validPayload(), g: [0, 99, -1, 'x', 0] })
      );
      expect(result.success && result.data.tags).toEqual(['flying']);
    });

    it('rejects too many items, and empty lists', async () => {
      const items = Array.from({ length: SHARE_LIMITS.maxItems + 1 }, (_, i) => [`Item ${i}`, 0]);
      await expectRejected(await craft({ ...validPayload(), i: items }), /more than 500 items/);
      await expectRejected(await craft({ ...validPayload(), i: [] }), /no items/);
    });

    it('rejects non-integer and out-of-range quantities', async () => {
      for (const q of [1.5, 0, -2, 1000, '3', null]) {
        await expectRejected(await craft({ ...validPayload(), i: [['Shirt', 0, q]] }), /quantity/);
      }
    });

    it('rejects over-long or non-string names and titles', async () => {
      const long = 'x'.repeat(SHARE_LIMITS.maxNameLength + 1);
      await expectRejected(await craft({ ...validPayload(), t: long }), /title/);
      await expectRejected(await craft({ ...validPayload(), c: [long] }), /category/);
      await expectRejected(await craft({ ...validPayload(), i: [[long, 0]] }), /name/);
      await expectRejected(await craft({ ...validPayload(), i: [[42, 0]] }), /name/);
      await expectRejected(await craft({ ...validPayload(), i: [['   ', 0]] }), /name/);
    });

    it('rejects malformed items and packed status', async () => {
      await expectRejected(await craft({ ...validPayload(), i: ['Shirt'] }), /item 1/);
      await expectRejected(
        await craft({ ...validPayload(), i: [['Shirt', 0, 1, 0, 1, 9]] }),
        /item 1/
      );
      await expectRejected(
        await craft({ ...validPayload(), k: 1, i: [['Shirt', 0, 1, 0, 2]] }),
        /packed/
      );
      await expectRejected(
        await craft({ ...validPayload(), i: [['Shirt', 0, 1, 0, 1]] }),
        /packed/
      );
      await expectRejected(await craft({ ...validPayload(), k: true }), /packed/);
    });
  });
});
