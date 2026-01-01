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
  }
}

/**
 * Database instance (singleton pattern)
 */
export const db = new PackingDB();
