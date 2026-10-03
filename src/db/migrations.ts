import type { Transaction } from 'dexie';
import type { PackPhase, QuantityRule, TripTag } from '@/types';
import { findCatalogItem } from './catalog';

/** Default item names from the v1 seed that were renamed in the v2 catalog */
const LEGACY_ITEM_NAMES: Record<string, string> = {
  't-shirt': 'T-shirts/tops',
  'pants/jeans': 'Pants/trousers',
  'formal shirt': 'Dress shirts/blouses',
  shorts: 'Shorts',
  'soap/body wash': 'Soap/body wash',
  'power bank': 'Power bank (carry-on only)',
  passport: 'Passport (valid 6+ months)',
  'travel tickets/confirmation': 'Travel tickets/booking confirmations',
  'travel insurance': 'Travel insurance details',
  'hat/cap': 'Sun hat/cap',
  'first aid kit': 'Painkillers & plasters',
  'hand sanitizer': 'Hand sanitiser',
  'travel pillow': 'Neck pillow',
  'eye mask': 'Earplugs & eye mask',
};

/** The v1 generator filtered items by name; carry that over as tags */
function legacyTagsForName(name: string): TripTag[] {
  const lower = name.toLowerCase();
  const tags: TripTag[] = [];
  if (lower.includes('formal')) tags.push('formal');
  if (lower.includes('swim')) tags.push('beach');
  if (lower.includes('short') || lower.includes('sunscreen')) tags.push('hot');
  return tags;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- migrations operate on untyped legacy rows */

/**
 * v3: per-item quantity rules, trip tags and pack phases replace daily/singular categories
 * and per-day checklist rows.
 */
export async function upgradeToV3(tx: Transaction): Promise<void> {
  const categories: any[] = await tx.table('categories').toArray();
  const dailyCategoryIds = new Set(categories.filter((c) => c.type === 'daily').map((c) => c.id));

  await tx
    .table('categories')
    .toCollection()
    .modify((category: any) => {
      delete category.type;
    });

  let templateOrder = 0;
  await tx
    .table('item_templates')
    .toCollection()
    .modify((template: any) => {
      template.name = LEGACY_ITEM_NAMES[template.name.toLowerCase()] ?? template.name;
      const catalogItem = findCatalogItem(template.name);
      const fallbackQuantity: QuantityRule = dailyCategoryIds.has(template.category_id)
        ? { kind: 'per_day', rate: 1, spare: true }
        : { kind: 'fixed', count: 1 };
      template.tags = catalogItem ? (catalogItem.tags ?? []) : legacyTagsForName(template.name);
      template.quantity = catalogItem?.quantity ?? fallbackQuantity;
      template.phase = catalogItem?.phase ?? 'ahead';
      template.sort_order = ++templateOrder;
    });

  await tx
    .table('checklists')
    .toCollection()
    .modify((checklist: any) => {
      const tags: TripTag[] = [];
      if (checklist.formal_attire) tags.push('formal');
      if (checklist.swimming) tags.push('beach');
      if (checklist.hot_weather) tags.push('hot');
      if (checklist.washing_machine_available) tags.push('laundry');
      checklist.tags = tags;
      checklist.spare_days = checklist.buffer_days ?? 0;
      delete checklist.buffer_days;
      delete checklist.formal_attire;
      delete checklist.swimming;
      delete checklist.hot_weather;
    });

  // Collapse per-day rows into one row per item
  const items: any[] = await tx.table('checklist_items').toArray();
  const groups = new Map<string, any[]>();
  for (const item of items) {
    const key = `${item.checklist_id}|${item.category_id}|${item.name}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const merged: any[] = [];
  let itemOrder = 0;
  for (const group of groups.values()) {
    const first = group[0];
    const phase: PackPhase = findCatalogItem(first.name)?.phase ?? 'ahead';
    merged.push({
      checklist_id: first.checklist_id,
      name: first.name,
      category_name: first.category_name,
      category_id: first.category_id,
      quantity: group.reduce((sum, i) => sum + (i.quantity ?? 1), 0),
      phase,
      checked: group.every((i) => i.checked),
      sort_order: ++itemOrder,
    });
  }

  await tx.table('checklist_items').clear();
  await tx.table('checklist_items').bulkAdd(merged);
}
