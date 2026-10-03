import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { db } from '../../../src/db/schema';
import { seedDefaultData } from '../../../src/db/seed';
import { CATALOG_VERSION, DEFAULT_CATALOG } from '../../../src/db/catalog';

const catalogItemCount = DEFAULT_CATALOG.reduce((sum, c) => sum + c.items.length, 0);

/** Create a database in the original v1 shape, as written by the first release */
async function createV1Database() {
  const v1 = new Dexie('PackingDB');
  v1.version(1).stores({
    checklists: '++id, created_at',
    checklist_items: '++id, checklist_id, category_id, checked',
    item_templates: '++id, category_id, enabled',
    categories: '++id, sort_order',
    preferences: '++id',
  });
  await v1.open();

  const clothes = (await v1.table('categories').add({
    name: 'Clothes',
    type: 'daily',
    default_included: true,
    sort_order: 1,
  })) as number;
  const toiletries = (await v1.table('categories').add({
    name: 'Toiletries',
    type: 'singular',
    default_included: true,
    sort_order: 2,
  })) as number;
  await v1.table('item_templates').bulkAdd([
    { name: 'T-shirt', category_id: clothes, enabled: true },
    { name: 'Swim shorts', category_id: clothes, enabled: true },
    { name: 'Lucky hat', category_id: clothes, enabled: false },
    { name: 'Toothbrush', category_id: toiletries, enabled: true },
  ]);
  await v1.table('preferences').add({
    buffer_days_ratio: 5,
    min_buffer_days: 2,
    category_defaults: { [clothes]: true, [toiletries]: true },
    preferred_categories: [clothes, toiletries],
    welcome_seen: true,
  });
  const checklistId = await v1.table('checklists').add({
    title: 'Jun 1 - Jun 3, 2024',
    start_date: '2024-06-01',
    end_date: '2024-06-03',
    buffer_days: 1,
    formal_attire: false,
    swimming: true,
    hot_weather: true,
    washing_machine_available: false,
    created_at: '2024-05-01T00:00:00.000Z',
  });
  await v1.table('checklist_items').bulkAdd([
    ...[1, 2, 3, 4].map((day) => ({
      checklist_id: checklistId,
      name: 'T-shirt',
      category_name: 'Clothes',
      category_id: clothes,
      quantity: 1,
      day,
      checked: day <= 2,
    })),
    {
      checklist_id: checklistId,
      name: 'Toothbrush',
      category_name: 'Toiletries',
      category_id: toiletries,
      quantity: 1,
      checked: true,
    },
  ]);
  v1.close();
}

describe('database seeding and migrations', () => {
  beforeEach(async () => {
    db.close();
    await Dexie.delete('PackingDB');
  });

  it('seeds the full catalog into a fresh database', async () => {
    await db.open();
    await seedDefaultData();

    expect(await db.categories.count()).toBe(DEFAULT_CATALOG.length);
    expect(await db.item_templates.count()).toBe(catalogItemCount);
    const preferences = await db.preferences.toArray();
    expect(preferences).toHaveLength(1);
    expect(preferences[0]).toMatchObject({ id: 1, catalog_version: CATALOG_VERSION });
    expect(Object.keys(preferences[0]!.category_defaults)).toHaveLength(DEFAULT_CATALOG.length);
  });

  it('is idempotent', async () => {
    await db.open();
    await seedDefaultData();
    await seedDefaultData();
    expect(await db.item_templates.count()).toBe(catalogItemCount);
    expect(await db.preferences.count()).toBe(1);
  });

  it('migrates a v1 database and merges the new catalog', async () => {
    await createV1Database();
    await db.open();
    await seedDefaultData();

    // Categories lose their daily/singular type; new catalog categories are added
    const categories = await db.categories.orderBy('sort_order').toArray();
    expect(categories.every((c) => !('type' in c))).toBe(true);
    expect(categories.map((c) => c.name)).toContain('Leaving the House');

    // Renamed default items take the new catalog rules; custom ones keep legacy behaviour
    const templates = await db.item_templates.toArray();
    const byName = (name: string) => templates.find((t) => t.name === name);
    expect(byName('T-shirt')).toBeUndefined();
    expect(byName('T-shirts/tops')).toMatchObject({
      quantity: { kind: 'per_day', rate: 1, spare: true },
      tags: [],
    });
    expect(byName('Swim shorts')).toMatchObject({
      tags: ['beach', 'hot'],
      quantity: { kind: 'per_day', rate: 1, spare: true },
      phase: 'ahead',
    });
    expect(byName('Lucky hat')).toMatchObject({ enabled: false, tags: [] });
    expect(byName('Toothbrush')).toMatchObject({
      quantity: { kind: 'fixed', count: 1 },
      phase: 'last_minute',
    });
    // No duplicates from the merge
    const lowerNames = templates.map((t) => t.name.toLowerCase());
    expect(new Set(lowerNames).size).toBe(lowerNames.length);

    // Preferences are kept, with defaults for the new categories
    const preferences = await db.preferences.get(1);
    expect(preferences).toMatchObject({
      buffer_days_ratio: 5,
      min_buffer_days: 2,
      welcome_seen: true,
      catalog_version: CATALOG_VERSION,
    });
    expect(Object.keys(preferences!.category_defaults)).toHaveLength(categories.length);

    // Checklist booleans become tags; per-day rows collapse into one row per item
    const checklist = (await db.checklists.toArray())[0]!;
    expect(checklist.tags).toEqual(['beach', 'hot']);
    expect(checklist.spare_days).toBe(1);
    const items = await db.checklist_items.toCollection().sortBy('sort_order');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: 'T-shirt', quantity: 4, checked: false });
    expect(items[0]).not.toHaveProperty('day');
    expect(items[1]).toMatchObject({ name: 'Toothbrush', checked: true, phase: 'last_minute' });
  });
});
