# Data Model: Packing Checklist PWA

**Date**: 2025-12-28
**Feature**: Packing Checklist PWA
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

## Overview

This document defines the IndexedDB schema using Dexie.js 4.x with TypeScript types. The schema consists of five primary tables (`checklists`, `checklist_items`, `item_templates`, `categories`, `preferences`) with versioned migrations to support schema evolution. Item templates (managed in settings) are separate from checklist items (generated instances), ensuring settings changes only affect future checklists. All entities are strongly typed to ensure type safety across services and components.

---

## Database Schema

### Dexie.js Schema Definition

```typescript
// src/db/schema.ts
import Dexie, { Table } from 'dexie';

/**
 * Checklist entity: Represents a generated packing list for a specific trip
 */
export interface Checklist {
  id?: number; // Auto-increment primary key (optional for inserts)
  title: string; // Auto-generated from dates (e.g., "Dec 15 - Dec 22, 2025")
  start_date: string; // ISO 8601 date string (YYYY-MM-DD)
  end_date: string; // ISO 8601 date string (YYYY-MM-DD)
  buffer_days: number; // Additional days to pack for (no limit)
  formal_attire: boolean; // Whether to include formal clothing items
  swimming: boolean; // Whether to include swimwear
  hot_weather: boolean; // Whether to include summer/hot weather items
  washing_machine_available: boolean; // Whether washing machine is available at destination
  max_days_before_washing?: number; // Max days before washing (if washing_machine_available)
  created_at: string; // ISO 8601 timestamp (YYYY-MM-DDTHH:mm:ss.sssZ)
  updated_at?: string; // ISO 8601 timestamp (for future sync features)
}

/**
 * ChecklistItem entity: Single item in a generated checklist (immutable snapshot)
 */
export interface ChecklistItem {
  id?: number; // Auto-increment primary key
  checklist_id: number; // Foreign key to Checklist (indexed for fast lookups)
  name: string; // Item name copied from template at generation time
  category_name: string; // Category name copied from template (for display if category deleted)
  category_id: number; // Original category ID (for grouping/filtering)
  quantity: number; // Calculated quantity at generation time (e.g., 3 shirts for 3-day trip)
  day?: number; // Optional: 1-indexed day number (reserved for future per-item day assignment; not used in MVP)
  checked: boolean; // Whether user has packed this item (persisted across sessions)
}

/**
 * ItemTemplate entity: Template for items in categories (managed in settings)
 */
export interface ItemTemplate {
  id?: number; // Auto-increment primary key
  name: string; // Item name (e.g., "T-shirt", "Toothbrush")
  category_id: number; // Foreign key to Category
  enabled: boolean; // Whether item is included by default in generation (managed in settings)
}

/**
 * Category entity: Logical grouping for items with type-based behavior
 */
export interface Category {
  id?: number; // Auto-increment primary key
  name: string; // Category name (e.g., "Clothes", "Toiletries")
  type: 'daily' | 'singular'; // Daily: per-day quantities, Singular: one-off items
  default_included: boolean; // Whether category is included by default in questionnaire
  sort_order: number; // Display order in UI (ascending)
  icon?: string; // Optional: icon identifier for UI (e.g., "shirt", "toothbrush")
}

/**
 * Preference entity: User preferences (singleton pattern, id always 1)
 */
export interface Preference {
  id?: number; // Always 1 (singleton)
  buffer_days_ratio: number; // 1 buffer day per N trip days (e.g., 7 means 1 buffer day per week)
  min_buffer_days: number; // Minimum buffer days regardless of trip length (default: 1)
  category_defaults: Record<number, boolean>; // category_id → default_included mapping
  preferred_categories: number[]; // Ordered list of category IDs for UI sorting
}

/**
 * PackingDB: Dexie.js database class with versioned schema
 */
export class PackingDB extends Dexie {
  // Typed table properties (initialized by Dexie constructor)
  checklists!: Table<Checklist, number>;
  checklist_items!: Table<ChecklistItem, number>;
  item_templates!: Table<ItemTemplate, number>;
  categories!: Table<Category, number>;
  preferences!: Table<Preference, number>;

  constructor() {
    super('PackingDB'); // IndexedDB database name

    // Version 1: Initial schema
    this.version(1).stores({
      checklists: '++id, created_at', // Primary key auto-increment, index on created_at for sorting
      checklist_items: '++id, checklist_id, category_id, checked', // Generated checklist item instances
      item_templates: '++id, category_id', // Item templates managed in settings
      categories: '++id, sort_order', // Index on sort_order for ordered display
      preferences: '++id', // Singleton table (only id:1 exists)
    });

    // Seed default data on database creation
    this.on('populate', async () => {
      await seedDefaultData(this);
    });

    // Future migration example (commented out for reference):
    // this.version(2).stores({
    //   checklists: '++id, created_at, updated_at', // Add updated_at index
    // }).upgrade(tx => {
    //   return tx.table('checklists').toCollection().modify(checklist => {
    //     checklist.updated_at = checklist.created_at; // Backfill existing rows
    //   });
    // });
  }
}

/**
 * Database instance (singleton pattern)
 */
export const db = new PackingDB();
```

---

## Seed Data

Default categories and items to provide immediate value on first app open.

```typescript
// src/db/seed.ts
import { db, Category, Item, Preference } from './schema';

/**
 * Seed default categories, items, and preferences on database creation
 */
export async function seedDefaultData(database: typeof db): Promise<void> {
  // Default categories
  const categories: Omit<Category, 'id'>[] = [
    { name: 'Clothes', type: 'daily', default_included: true, sort_order: 1, icon: 'shirt' },
    { name: 'Toiletries', type: 'daily', default_included: true, sort_order: 2, icon: 'droplet' },
    { name: 'Electronics', type: 'singular', default_included: true, sort_order: 3, icon: 'laptop' },
    { name: 'Documents', type: 'singular', default_included: true, sort_order: 4, icon: 'file' },
    { name: 'Accessories', type: 'singular', default_included: false, sort_order: 5, icon: 'watch' },
    { name: 'Health & Safety', type: 'singular', default_included: false, sort_order: 6, icon: 'heart' },
    { name: 'Entertainment', type: 'singular', default_included: false, sort_order: 7, icon: 'book' },
  ];

  const categoryIds = await database.categories.bulkAdd(categories, { allKeys: true });

  // Default item templates (category_id references inserted categories)
  const itemTemplates: Omit<ItemTemplate, 'id'>[] = [
    // Clothes (daily)
    { name: 'T-shirt', category_id: categoryIds[0], enabled: true },
    { name: 'Underwear', category_id: categoryIds[0], enabled: true },
    { name: 'Socks', category_id: categoryIds[0], enabled: true },
    { name: 'Pants/Jeans', category_id: categoryIds[0], enabled: true },
    { name: 'Formal shirt', category_id: categoryIds[0], enabled: true }, // Conditional on formal_attire
    { name: 'Formal pants', category_id: categoryIds[0], enabled: true }, // Conditional on formal_attire
    { name: 'Swimsuit', category_id: categoryIds[0], enabled: true }, // Conditional on swimming
    { name: 'Shorts', category_id: categoryIds[0], enabled: true }, // Conditional on hot_weather
    { name: 'Light jacket', category_id: categoryIds[0], enabled: true },

    // Toiletries (daily)
    { name: 'Toothbrush', category_id: categoryIds[1], enabled: true },
    { name: 'Toothpaste', category_id: categoryIds[1], enabled: true },
    { name: 'Shampoo', category_id: categoryIds[1], enabled: true },
    { name: 'Soap/Body wash', category_id: categoryIds[1], enabled: true },
    { name: 'Deodorant', category_id: categoryIds[1], enabled: true },
    { name: 'Razor', category_id: categoryIds[1], enabled: true },
    { name: 'Sunscreen', category_id: categoryIds[1], enabled: true }, // Conditional on hot_weather

    // Electronics (singular)
    { name: 'Phone charger', category_id: categoryIds[2], enabled: true },
    { name: 'Laptop', category_id: categoryIds[2], enabled: false }, // Disabled by default (work trips only)
    { name: 'Laptop charger', category_id: categoryIds[2], enabled: false },
    { name: 'Headphones', category_id: categoryIds[2], enabled: true },
    { name: 'Power bank', category_id: categoryIds[2], enabled: true },
    { name: 'Camera', category_id: categoryIds[2], enabled: false },

    // Documents (singular)
    { name: 'Passport', category_id: categoryIds[3], enabled: true },
    { name: 'ID card', category_id: categoryIds[3], enabled: true },
    { name: 'Travel tickets/confirmation', category_id: categoryIds[3], enabled: true },
    { name: 'Travel insurance', category_id: categoryIds[3], enabled: true },
    { name: 'Credit/debit cards', category_id: categoryIds[3], enabled: true },

    // Accessories (singular, optional category)
    { name: 'Watch', category_id: categoryIds[4], enabled: true },
    { name: 'Sunglasses', category_id: categoryIds[4], enabled: true },
    { name: 'Hat/Cap', category_id: categoryIds[4], enabled: true },
    { name: 'Belt', category_id: categoryIds[4], enabled: true },

    // Health & Safety (singular, optional category)
    { name: 'Prescription medications', category_id: categoryIds[5], enabled: true },
    { name: 'First aid kit', category_id: categoryIds[5], enabled: true },
    { name: 'Hand sanitizer', category_id: categoryIds[5], enabled: true },
    { name: 'Face masks', category_id: categoryIds[5], enabled: false },

    // Entertainment (singular, optional category)
    { name: 'Book/E-reader', category_id: categoryIds[6], enabled: true },
    { name: 'Travel pillow', category_id: categoryIds[6], enabled: false },
    { name: 'Eye mask', category_id: categoryIds[6], enabled: false },
  ];

  // Add item templates to database (these are editable in settings)
  await database.item_templates.bulkAdd(itemTemplates);

  // Default preferences
  const defaultPreference: Omit<Preference, 'id'> = {
    buffer_days_ratio: 7, // 1 buffer day per 7 trip days (1 week)
    min_buffer_days: 1, // At least 1 buffer day
    category_defaults: {
      [categoryIds[0]]: true, // Clothes: included by default
      [categoryIds[1]]: true, // Toiletries: included by default
      [categoryIds[2]]: true, // Electronics: included by default
      [categoryIds[3]]: true, // Documents: included by default
      [categoryIds[4]]: false, // Accessories: excluded by default
      [categoryIds[5]]: false, // Health & Safety: excluded by default
      [categoryIds[6]]: false, // Entertainment: excluded by default
    },
    preferred_categories: categoryIds, // Sorted by sort_order
  };

  await database.preferences.add(defaultPreference);
}
```

---

## Entity Relationships

```
┌─────────────┐
│ Checklist   │
│ (id: PK)    │
└─────┬───────┘
      │ 1
      │
      │ N
┌─────▼────────────┐       ┌──────────────┐
│ ChecklistItem    │       │ Category     │
│ (id: PK)         │  N:1  │ (id: PK)     │
│ checklist_id     ├───────┤ type: daily  │
│ category_id      │       │   | singular │
│ checked          │       └───────┬──────┘
│ [snapshot copy]  │               │ 1
└──────────────────┘               │
                                   │ N
                         ┌─────────▼────────┐
                         │ ItemTemplate     │
                         │ (id: PK)         │
                         │ category_id      │
                         │ enabled          │
                         │ [editable in     │
                         │  settings]       │
                         └──────────────────┘

┌─────────────┐
│ Preference  │
│ (id: 1)     │  Singleton
│ category_   │
│  defaults   │
└─────────────┘
```

**Relationships**:
- `Checklist`: Singleton (only 1 row with id=1, replaced on each generation)
- `Checklist` → `ChecklistItem`: One-to-many (1 checklist has many item instances, immutable after generation)
- `Category` → `ChecklistItem`: One-to-many (reference for grouping, soft link via category_id)
- `Category` → `ItemTemplate`: One-to-many (1 category has many editable templates in settings)
- `Preference`: Singleton (only 1 row with id=1)

**Key Design Decision**: Single active checklist at a time. Generating a new checklist replaces the existing one. Checklist generation copies item templates into checklist_items with calculated quantities and category names, so settings changes don't affect the active checklist.

**Indexes** (optimized for common queries):
- `checklist_items.checklist_id`: Fast lookup of all items (always id=1)
- `checklist_items.category_id`: Fast lookup of all items in a category
- `checklist_items.checked`: Filter checked/unchecked items
- `item_templates.category_id`: Fast lookup of all templates in a category
- `categories.sort_order`: Display categories in order

---

## Validation Rules

### Checklist

- `start_date`, `end_date`: Valid ISO 8601 date strings, `start_date <= end_date`
- `buffer_days`: Non-negative integer (no upper limit)
- `max_days_before_washing`: Optional non-negative integer (no upper limit), required if `washing_machine_available = true`. Note: value is validated as non-negative; business logic may further constrain or interpret this value relative to trip duration.

### ChecklistItem

- `name`: Non-empty string, max 50 chars (copied from template at generation)
- `category_name`: Non-empty string, max 30 chars (copied from category at generation)
- `quantity`: Integer, 1-100 range (calculated at generation time)
- `checklist_id`, `category_id`: Valid foreign keys

### ItemTemplate

- `name`: Non-empty string, max 50 chars
- `category_id`: Valid foreign key to Category

### Category

- `name`: Non-empty string, max 30 chars, unique
- `type`: Enum (`daily` | `singular`)
- `sort_order`: Integer, 1-100 range

### Preference

- `buffer_days_ratio`: Positive integer (minimum 1, no upper limit; e.g., 7 = 1 buffer day per week)
- `min_buffer_days`: Non-negative integer (no upper limit)
- `category_defaults`: Object with integer keys (category IDs)
- `preferred_categories`: Array of integers (category IDs)

---

## Migration Strategy

Dexie.js supports versioned migrations using `.version(n).stores({...}).upgrade(tx => {...})` API.

**Example Migration** (add `updated_at` field to Checklist):

```typescript
// src/db/schema.ts
this.version(2).stores({
  checklists: '++id, created_at, updated_at', // Add updated_at index
}).upgrade(tx => {
  return tx.table('checklists').toCollection().modify(checklist => {
    checklist.updated_at = checklist.created_at; // Backfill existing rows
  });
});
```

**Migration Best Practices**:
- Never decrement version number
- Use `.upgrade()` for data transformations (backfilling new fields, renaming fields)
- Test migrations with production-like data before deployment
- Document all migrations in this file

---

## TypeScript Type Guards

```typescript
// src/db/guards.ts

export function isChecklist(obj: unknown): obj is Checklist {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'title' in obj &&
    'start_date' in obj &&
    'end_date' in obj
  );
}

export function isChecklistItem(obj: unknown): obj is ChecklistItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'checklist_id' in obj &&
    'category_id' in obj &&
    'checked' in obj
  );
}

export function isItemTemplate(obj: unknown): obj is ItemTemplate {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'category_id' in obj &&
    'enabled' in obj
  );
}

export function isCategory(obj: unknown): obj is Category {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'type' in obj &&
    (obj as any).type in ['daily', 'singular']
  );
}
```

---

## Summary

- **5 tables**: `checklists`, `checklist_items` (instances), `item_templates` (settings), `categories`, `preferences`
- **Template/Instance Separation**: Checklist generation creates immutable snapshots of templates; settings changes only affect future checklists
- **Versioned schema**: Dexie.js v1 (initial), future migrations documented
- **Seed data**: 7 default categories, 40+ item templates, 1 preference row
- **Indexes**: Optimized for common queries (FK lookups, sorting, filtering)
- **Type safety**: Full TypeScript types with strict mode compatibility
- **Validation**: Rules defined for all fields with sensible ranges
- **Migration strategy**: Dexie.js `.version().upgrade()` API with backfill examples

**Next Steps**: Create service contracts in `contracts/` directory.
