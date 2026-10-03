import Dexie, { type EntityTable } from 'dexie';
import type { Checklist, ChecklistItem, ItemTemplate, Category, Preference } from '@/types';

/**
 * PackingDB: Dexie.js database class with versioned schema
 */
export class PackingDB extends Dexie {
  checklists!: EntityTable<Checklist, 'id'>;
  checklist_items!: EntityTable<ChecklistItem, 'id'>;
  item_templates!: EntityTable<ItemTemplate, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  preferences!: EntityTable<Preference, 'id'>;

  constructor() {
    super('PackingDB');

    // Version 1: Initial schema
    this.version(1).stores({
      checklists: '++id, created_at',
      checklist_items: '++id, checklist_id, category_id, checked',
      item_templates: '++id, category_id, enabled',
      categories: '++id, sort_order',
      preferences: '++id',
    });

    // Version 2: Compound index for per-category queries within a checklist
    this.version(2).stores({
      checklist_items: '++id, checklist_id, category_id, checked, [checklist_id+category_id]',
    });
  }
}

/**
 * Database instance (singleton pattern)
 */
export const db = new PackingDB();
