import type { Category, ItemTemplate, Preference } from '@/types';
import { db } from './schema';

/**
 * Seed default categories, items, and preferences on database creation
 */
export async function seedDefaultData(): Promise<void> {
  // Check if already seeded
  const existingCategories = await db.categories.count();
  if (existingCategories > 0) {
    return; // Already seeded
  }

  // Default categories
  const categories: Omit<Category, 'id'>[] = [
    { name: 'Clothes', type: 'daily', default_included: true, sort_order: 1, icon: 'shirt' },
    {
      name: 'Toiletries',
      type: 'singular',
      default_included: true,
      sort_order: 2,
      icon: 'droplet',
    },
    {
      name: 'Electronics',
      type: 'singular',
      default_included: true,
      sort_order: 3,
      icon: 'laptop',
    },
    {
      name: 'Documents',
      type: 'singular',
      default_included: true,
      sort_order: 4,
      icon: 'file',
    },
    {
      name: 'Accessories',
      type: 'singular',
      default_included: false,
      sort_order: 5,
      icon: 'watch',
    },
    {
      name: 'Health & Safety',
      type: 'singular',
      default_included: false,
      sort_order: 6,
      icon: 'heart',
    },
    {
      name: 'Entertainment',
      type: 'singular',
      default_included: false,
      sort_order: 7,
      icon: 'book',
    },
  ];

  const categoryIds = await db.categories.bulkAdd(categories, { allKeys: true });

  // Default item templates
  const itemTemplates: Omit<ItemTemplate, 'id'>[] = [
    // Clothes (daily)
    { name: 'T-shirt', category_id: categoryIds[0] as number, enabled: true },
    { name: 'Underwear', category_id: categoryIds[0] as number, enabled: true },
    { name: 'Socks', category_id: categoryIds[0] as number, enabled: true },
    { name: 'Pants/Jeans', category_id: categoryIds[0] as number, enabled: true },
    { name: 'Formal shirt', category_id: categoryIds[0] as number, enabled: true },
    { name: 'Formal pants', category_id: categoryIds[0] as number, enabled: true },
    { name: 'Swimsuit', category_id: categoryIds[0] as number, enabled: true },
    { name: 'Shorts', category_id: categoryIds[0] as number, enabled: true },
    { name: 'Light jacket', category_id: categoryIds[0] as number, enabled: true },

    // Toiletries (singular)
    { name: 'Toothbrush', category_id: categoryIds[1] as number, enabled: true },
    { name: 'Toothpaste', category_id: categoryIds[1] as number, enabled: true },
    { name: 'Shampoo', category_id: categoryIds[1] as number, enabled: true },
    { name: 'Soap/Body wash', category_id: categoryIds[1] as number, enabled: true },
    { name: 'Deodorant', category_id: categoryIds[1] as number, enabled: true },
    { name: 'Razor', category_id: categoryIds[1] as number, enabled: true },
    { name: 'Sunscreen', category_id: categoryIds[1] as number, enabled: true },

    // Electronics (singular)
    { name: 'Phone charger', category_id: categoryIds[2] as number, enabled: true },
    { name: 'Laptop', category_id: categoryIds[2] as number, enabled: false },
    { name: 'Laptop charger', category_id: categoryIds[2] as number, enabled: false },
    { name: 'Headphones', category_id: categoryIds[2] as number, enabled: true },
    { name: 'Power bank', category_id: categoryIds[2] as number, enabled: true },
    { name: 'Camera', category_id: categoryIds[2] as number, enabled: false },

    // Documents (singular)
    { name: 'Passport', category_id: categoryIds[3] as number, enabled: true },
    { name: 'ID card', category_id: categoryIds[3] as number, enabled: true },
    { name: 'Travel tickets/confirmation', category_id: categoryIds[3] as number, enabled: true },
    { name: 'Travel insurance', category_id: categoryIds[3] as number, enabled: true },
    { name: 'Credit/debit cards', category_id: categoryIds[3] as number, enabled: true },

    // Accessories (singular)
    { name: 'Watch', category_id: categoryIds[4] as number, enabled: true },
    { name: 'Sunglasses', category_id: categoryIds[4] as number, enabled: true },
    { name: 'Hat/Cap', category_id: categoryIds[4] as number, enabled: true },
    { name: 'Belt', category_id: categoryIds[4] as number, enabled: true },

    // Health & Safety (singular)
    { name: 'Prescription medications', category_id: categoryIds[5] as number, enabled: true },
    { name: 'First aid kit', category_id: categoryIds[5] as number, enabled: true },
    { name: 'Hand sanitizer', category_id: categoryIds[5] as number, enabled: true },
    { name: 'Face masks', category_id: categoryIds[5] as number, enabled: false },

    // Entertainment (singular)
    { name: 'Book/E-reader', category_id: categoryIds[6] as number, enabled: true },
    { name: 'Travel pillow', category_id: categoryIds[6] as number, enabled: false },
    { name: 'Eye mask', category_id: categoryIds[6] as number, enabled: false },
  ];

  await db.item_templates.bulkAdd(itemTemplates);

  // Default preferences
  const defaultPreference: Omit<Preference, 'id'> = {
    buffer_days_ratio: 7,
    min_buffer_days: 1,
    category_defaults: {
      [categoryIds[0] as number]: true,
      [categoryIds[1] as number]: true,
      [categoryIds[2] as number]: true,
      [categoryIds[3] as number]: true,
      [categoryIds[4] as number]: false,
      [categoryIds[5] as number]: false,
      [categoryIds[6] as number]: false,
    },
    preferred_categories: categoryIds as number[],
    welcome_seen: false,
  };

  await db.preferences.add(defaultPreference);
}
