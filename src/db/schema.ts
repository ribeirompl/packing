import Dexie, { type EntityTable } from 'dexie';
import type { Checklist, ChecklistItem, ItemTemplate, Category, Preference } from '@/types';

/**
 * PackingDB: Dexie.js database class
 */
export class PackingDB extends Dexie {
  checklists!: EntityTable<Checklist, 'id'>;
  checklist_items!: EntityTable<ChecklistItem, 'id'>;
  item_templates!: EntityTable<ItemTemplate, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  preferences!: EntityTable<Preference, 'id'>;

  constructor() {
    super('PackingChecklist');

    this.version(1).stores({
      checklists: '++id, created_at',
      checklist_items: '++id, checklist_id, category_id, [checklist_id+category_id]',
      item_templates: '++id, category_id',
      categories: '++id, sort_order',
      preferences: '++id',
    });
  }
}

/**
 * Database instance (singleton pattern)
 */
export const db = new PackingDB();
