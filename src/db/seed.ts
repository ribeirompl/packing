import type { ItemTemplate, Preference } from '@/types';
import { DEFAULT_CATALOG } from './catalog';
import { db } from './schema';

/**
 * Seed default categories, items and preferences when the database has no categories
 * (first run, or after "Reset to defaults" clears them)
 */
export async function seedDefaultData(): Promise<void> {
  await db.transaction('rw', db.categories, db.item_templates, db.preferences, async () => {
    if ((await db.categories.count()) > 0) {
      return;
    }

    const categoryDefaults: Record<number, boolean> = {};
    const categoryIds: number[] = [];

    for (const [index, catalogCategory] of DEFAULT_CATALOG.entries()) {
      const categoryId = (await db.categories.add({
        name: catalogCategory.name,
        icon: catalogCategory.icon,
        default_included: catalogCategory.default_included,
        sort_order: index + 1,
      })) as number;
      categoryIds.push(categoryId);
      categoryDefaults[categoryId] = catalogCategory.default_included;

      const templates: Omit<ItemTemplate, 'id'>[] = catalogCategory.items.map((item, i) => ({
        name: item.name,
        category_id: categoryId,
        enabled: item.enabled ?? true,
        tags: item.tags ?? [],
        quantity: item.quantity,
        phase: item.phase ?? 'ahead',
        sort_order: i + 1,
      }));
      await db.item_templates.bulkAdd(templates);
    }

    // Keep existing preferences (e.g. spare day settings) when re-seeding after a reset
    const existing = await db.preferences.get(1);
    const preferences: Preference = {
      buffer_days_ratio: 7,
      min_buffer_days: 1,
      welcome_seen: false,
      ...existing,
      category_defaults: categoryDefaults,
      preferred_categories: categoryIds,
      id: 1,
    };
    await db.preferences.put(preferences);
  });
}
