import type { ItemTemplate, Preference } from '@/types';
import { CATALOG_VERSION, DEFAULT_CATALOG } from './catalog';
import { db } from './schema';

/**
 * Seed default categories, items and preferences on first run, and merge in catalog
 * additions (matched by name, case-insensitively) when CATALOG_VERSION increases.
 * Existing categories and items, including user edits, are never modified.
 */
export async function seedDefaultData(): Promise<void> {
  await db.transaction('rw', db.categories, db.item_templates, db.preferences, async () => {
    const preferences = await db.preferences.get(1);
    if ((preferences?.catalog_version ?? 0) >= CATALOG_VERSION) {
      return;
    }

    const categories = await db.categories.toArray();
    const templates = await db.item_templates.toArray();
    const templateNames = new Set(templates.map((t) => t.name.toLowerCase()));
    const categoryDefaults: Record<number, boolean> = { ...preferences?.category_defaults };
    let nextCategoryOrder = Math.max(0, ...categories.map((c) => c.sort_order)) + 1;

    for (const catalogCategory of DEFAULT_CATALOG) {
      let category = categories.find(
        (c) => c.name.toLowerCase() === catalogCategory.name.toLowerCase()
      );
      if (!category) {
        const newCategory = {
          name: catalogCategory.name,
          icon: catalogCategory.icon,
          default_included: catalogCategory.default_included,
          sort_order: nextCategoryOrder++,
        };
        const id = (await db.categories.add(newCategory)) as number;
        category = { ...newCategory, id };
        categories.push(category);
        categoryDefaults[id] = catalogCategory.default_included;
      }

      const categoryId = category.id!;
      let nextItemOrder =
        Math.max(
          0,
          ...templates.filter((t) => t.category_id === categoryId).map((t) => t.sort_order)
        ) + 1;
      const newTemplates: Omit<ItemTemplate, 'id'>[] = catalogCategory.items
        .filter((item) => !templateNames.has(item.name.toLowerCase()))
        .map((item) => ({
          name: item.name,
          category_id: categoryId,
          enabled: item.enabled ?? true,
          tags: item.tags ?? [],
          quantity: item.quantity,
          phase: item.phase ?? 'ahead',
          sort_order: nextItemOrder++,
        }));
      await db.item_templates.bulkAdd(newTemplates);
    }

    const updated: Preference = {
      buffer_days_ratio: 7,
      min_buffer_days: 1,
      preferred_categories: [],
      welcome_seen: false,
      ...preferences,
      category_defaults: categoryDefaults,
      catalog_version: CATALOG_VERSION,
      id: 1,
    };
    updated.preferred_categories = categories.map((c) => c.id!);
    await db.preferences.put(updated);
  });
}
