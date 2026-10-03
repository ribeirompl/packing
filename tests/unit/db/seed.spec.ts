import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { db } from '../../../src/db/schema';
import { seedDefaultData } from '../../../src/db/seed';
import { DEFAULT_CATALOG } from '../../../src/db/catalog';
import { CategoryService } from '../../../src/services/CategoryService';

const catalogItemCount = DEFAULT_CATALOG.reduce((sum, c) => sum + c.items.length, 0);

describe('seedDefaultData', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await db.delete();
    await db.open();
  });

  it('seeds the full catalog into an empty database', async () => {
    await seedDefaultData();

    const categories = await db.categories.orderBy('sort_order').toArray();
    expect(categories.map((c) => c.name)).toEqual(DEFAULT_CATALOG.map((c) => c.name));
    expect(await db.item_templates.count()).toBe(catalogItemCount);

    const preferences = await db.preferences.toArray();
    expect(preferences).toHaveLength(1);
    expect(preferences[0]).toMatchObject({ id: 1, buffer_days_ratio: 7, min_buffer_days: 1 });
    expect(Object.keys(preferences[0]!.category_defaults)).toHaveLength(DEFAULT_CATALOG.length);
  });

  it('gives every catalog item a valid rule and phase', async () => {
    await seedDefaultData();
    for (const template of await db.item_templates.toArray()) {
      expect(template.phase).toMatch(/^(ahead|last_minute|leaving)$/);
      expect(template.quantity.kind).toMatch(/^(per_day|per_n_days|fixed)$/);
    }
  });

  it('does nothing when data already exists', async () => {
    await seedDefaultData();
    await seedDefaultData();
    expect(await db.item_templates.count()).toBe(catalogItemCount);
    expect(await db.preferences.count()).toBe(1);
  });

  it('restores defaults after a reset while keeping spare day settings', async () => {
    await seedDefaultData();
    await db.preferences.update(1, { buffer_days_ratio: 3, welcome_seen: true });
    await db.item_templates.clear();
    await db.item_templates.add({
      name: 'Custom',
      category_id: 1,
      enabled: true,
      tags: [],
      quantity: { kind: 'fixed', count: 1 },
      phase: 'ahead',
      sort_order: 1,
    });

    const result = await new CategoryService().resetToDefaults();

    expect(result.success).toBe(true);
    expect(await db.item_templates.count()).toBe(catalogItemCount);
    expect(await db.preferences.count()).toBe(1);
    expect(await db.preferences.get(1)).toMatchObject({ buffer_days_ratio: 3, welcome_seen: true });
  });
});
