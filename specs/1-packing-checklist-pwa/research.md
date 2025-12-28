# Research: Packing Checklist PWA

**Date**: 2025-12-28
**Feature**: Packing Checklist PWA
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Overview

This research document resolves all "NEEDS CLARIFICATION" items from the Technical Context and identifies best practices for implementing a fully offline-capable PWA using Vue 3, Dexie.js, and Vite PWA Plugin. The research covers IndexedDB schema design, checklist generation algorithms, offline persistence patterns, PWA installability, and performance optimization.

---

## Research Topics

### 1. IndexedDB Schema Design with Dexie.js

**Decision**: Use Dexie.js 4.x with five primary tables (`checklists`, `checklist_items`, `item_templates`, `categories`, `preferences`) and versioned migrations. The app maintains a single active checklist at a time (singleton). Item templates (managed in settings) are separate from checklist items (generated snapshots), so settings changes don't affect the active checklist.

**Rationale**:
- Dexie.js provides a typed, promise-based API that integrates seamlessly with TypeScript strict mode
- Version-based migrations allow incremental schema changes (e.g., adding `washing_machine_available` field in v2)
- Indexed queries enable fast lookups (e.g., find all items for a checklist, find all enabled items in a category)
- Transactions ensure data consistency when updating multiple tables (e.g., saving a checklist and updating item checked states atomically)

**Schema Design**:

```typescript
// db/schema.ts
import Dexie, { Table } from 'dexie';

export interface Checklist {
  id?: number; // Auto-increment primary key
  title: string;
  start_date: string; // ISO 8601 date string
  end_date: string;
  buffer_days: number;
  formal_attire: boolean;
  swimming: boolean;
  hot_weather: boolean;
  washing_machine_available: boolean;
  max_days_before_washing?: number;
  created_at: string; // ISO 8601 timestamp
}

export interface ChecklistItem {
  id?: number;
  checklist_id: number; // Foreign key to Checklist
  name: string; // Copied from ItemTemplate at generation
  category_name: string; // Copied from Category at generation
  category_id: number; // Reference to original category
  quantity: number; // Calculated at generation time
  day?: number; // Optional: 1-indexed day number (reserved for future)
  checked: boolean; // User packing state
}

export interface ItemTemplate {
  id?: number;
  name: string; // Template name (editable in settings)
  category_id: number; // Foreign key to Category
  enabled: boolean; // Whether included in generation by default
}

export interface Category {
  id?: number;
  name: string;
  type: 'daily' | 'singular'; // Daily: per-day quantities, Singular: one-off items
  default_included: boolean; // Included by default in questionnaire
  sort_order: number; // Display order in UI
}

export interface Preference {
  id?: number; // Always 1 (singleton pattern)
  buffer_days_ratio: number; // 1 buffer day per N trip days (default 7)
  min_buffer_days: number; // Minimum buffer days (default 1)
  category_defaults: Record<number, boolean>; // category_id → default_included
  preferred_categories: number[]; // Ordered list of category IDs
}

export class PackingDB extends Dexie {
  checklists!: Table<Checklist, number>;
  checklist_items!: Table<ChecklistItem, number>;
  item_templates!: Table<ItemTemplate, number>;
  categories!: Table<Category, number>;
  preferences!: Table<Preference, number>;

  constructor() {
    super('PackingDB');
    this.version(1).stores({
      checklists: '++id, created_at',
      checklist_items: '++id, checklist_id, category_id, checked',
      item_templates: '++id, category_id',
      categories: '++id, sort_order',
      preferences: '++id',
    });

    // Future migration example:
    // this.version(2).stores({
    //   checklists: '++id, created_at, washing_machine_available',
    // }).upgrade(tx => {
    //   return tx.table('checklists').toCollection().modify(checklist => {
    //     checklist.washing_machine_available = false;
    //   });
    // });
  }
}

export const db = new PackingDB();
```

**Alternatives Considered**:
- **localStorage**: Rejected due to 5-10MB limit, lack of structured querying, no transaction support, and constitutional preference for IndexedDB
- **Raw IndexedDB API**: Rejected due to verbosity, callback-based API incompatible with async/await, and lack of TypeScript integration
- **localForage**: Rejected due to less sophisticated schema versioning compared to Dexie.js and lower community adoption for complex schemas

---

### 2. Checklist Generation Algorithm

**Decision**: Implement a rule-based checklist generator in `ChecklistService.ts` that maps questionnaire inputs to item quantities using per-day calculations for `daily` categories and fixed quantities for `singular` categories.

**Rationale**:
- Per-day quantities for clothing items ensure users pack enough for the trip duration (e.g., 7-day trip → 7 shirts if washing machine unavailable, 3 shirts if available with max 2 days before washing)
- Singular items (phone charger, toiletries) are one-time additions regardless of trip duration
- Rule-based approach is transparent, testable, and easy to extend (e.g., adding seasonal rules for hot weather)
- Buffer days calculation logic:
  * If washing machine available with max_days_before_washing specified: buffer_days = max_days_before_washing
  * Otherwise: buffer_days = Math.max(Math.floor(tripDays / buffer_days_ratio), min_buffer_days)
  * Trip duration is inclusive: differenceInDays(end_date, start_date) + 1

**Algorithm Pseudocode**:

```typescript
// services/ChecklistService.ts
interface QuestionnaireInput {
  start_date: string;
  end_date: string;
  buffer_days: number; // Auto-calculated from preferences, user can override
  formal_attire: boolean;
  swimming: boolean;
  hot_weather: boolean;
  washing_machine_available: boolean;
  max_days_before_washing?: number;
  selected_categories: number[]; // User-selected category IDs
}

async function generateChecklist(input: QuestionnaireInput): Promise<Checklist> {
  // 1. Calculate trip duration (inclusive: start and end dates both count)
  const tripDays = differenceInDays(parseISO(input.end_date), parseISO(input.start_date)) + 1;
  const totalDays = tripDays + input.buffer_days;

  // 2. Calculate washing cycle factor
  let washingFactor = 1;
  if (input.washing_machine_available && input.max_days_before_washing) {
    washingFactor = Math.ceil(totalDays / input.max_days_before_washing);
  } else {
    washingFactor = totalDays; // No washing: need items for every day
  }

  // 3. Load enabled item templates from selected categories
  const categories = await db.categories.where('id').anyOf(input.selected_categories).toArray();
  const itemTemplates = await db.item_templates.where('category_id').anyOf(input.selected_categories).filter(tmpl => tmpl.enabled).toArray();

  // 4. Create checklist
  const checklist: Checklist = {
    title: `${format(parseISO(input.start_date), 'MMM d')} - ${format(parseISO(input.end_date), 'MMM d, yyyy')}`,
    ...input,
    created_at: new Date().toISOString(),
  };
  const checklistId = await db.checklists.add(checklist);

  // 5. Generate checklist item instances with calculated quantities (snapshot of templates)
  const checklistItems: ChecklistItem[] = [];
  for (const template of itemTemplates) {
    const category = categories.find(c => c.id === template.category_id)!;
    let quantity = 1;

    if (category.type === 'daily') {
      // Per-day quantities (e.g., shirts, underwear)
      quantity = Math.ceil(totalDays / washingFactor);

      // Apply conditional rules
      if (template.name.includes('formal') && !input.formal_attire) continue;
      if (template.name.includes('swimsuit') && !input.swimming) continue;
      if (template.name.includes('shorts') && !input.hot_weather) continue;
    } else {
      // Singular items: fixed quantity
      quantity = 1;
    }

    checklistItems.push({
      checklist_id: checklistId,
      name: template.name, // Copy from template
      category_name: category.name, // Copy from category (for display if category deleted)
      category_id: template.category_id,
      quantity,
      checked: false,
    });
  }

  await db.checklist_items.bulkAdd(checklistItems);
  return checklist;
}
```

**Alternatives Considered**:
- **AI/ML-based recommendations**: Rejected for MVP due to complexity, lack of offline support, and unclear value proposition over rule-based approach
- **Hardcoded item lists**: Rejected due to inflexibility and inability to support user-created categories/items (FR-010 requirement)
- **Template-based with string interpolation**: Considered but rejected due to lack of structured logic and difficulty testing edge cases

---

### 3. Offline Persistence Patterns

**Decision**: Use Vite PWA Plugin with Workbox's `generateSW` strategy (precache + runtime caching) and Dexie.js for user data persistence.

**Rationale**:
- **Precaching** ensures all app shell assets (HTML, JS, CSS, icons) are cached on first visit and available offline
- **Runtime caching** with `NetworkFirst` strategy for API-like requests (future-proofing for optional cloud sync)
- **Dexie.js** handles all user data (checklists, preferences) with instant reads/writes and no network dependency
- **Service Worker lifecycle** automatically updates cache when new version deployed (version increment in manifest)

**Vite PWA Plugin Configuration**:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'Packing Checklist',
        short_name: 'PackList',
        description: 'Offline-first PWA for trip packing checklists',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
```

**Alternatives Considered**:
- **Manual Service Worker with injectManifest**: Rejected for MVP due to increased complexity and maintenance burden; `generateSW` covers all requirements
- **localStorage for offline data**: Rejected per constitution (IndexedDB required as single source of truth)
- **No Service Worker (rely on browser caching)**: Rejected due to constitutional requirement for offline-first and PWA installability

---

### 4. PWA Installability Best Practices

**Decision**: Implement complete Web App Manifest, Service Worker registration, and iOS-specific meta tags to ensure installability across iOS Safari 15+, Android Chrome 90+, and desktop browsers.

**Rationale**:
- iOS Safari requires additional meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`) for proper standalone mode
- Maskable icons ensure Android adaptive icon support (safe zone within icon boundary)
- Standalone display mode removes browser chrome for app-like experience
- HTTPS required for production (localhost exempt for dev)

**Implementation Checklist**:

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#3b82f6" />
    <meta name="description" content="Offline-first PWA for trip packing checklists" />

    <!-- iOS-specific meta tags -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="PackList" />
    <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

    <!-- Web App Manifest -->
    <link rel="manifest" href="/manifest.json" />

    <title>Packing Checklist</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**Alternatives Considered**:
- **Native mobile apps**: Rejected due to increased complexity, app store friction, and constitutional preference for cross-platform PWAs
- **WebView wrappers (Capacitor, Cordova)**: Rejected for MVP; PWA covers all requirements without native compilation overhead

---

### 5. Performance Optimization Strategies

**Decision**: Implement bundle splitting, lazy loading of routes, critical CSS extraction, and Lighthouse-driven performance budgets to meet FCP <1.5s, LCP <2.5s, TTI <3.5s targets.

**Rationale**:
- Vite's default code splitting ensures vendor libraries (Vue, Dexie) are cached separately from app code
- Vue Router's lazy-loaded routes defer loading of Settings view until user navigates there
- Tailwind CSS purging removes unused styles in production build
- Lighthouse CI integration enforces performance gates in CI/CD pipeline

**Performance Configuration**:

```typescript
// vite.config.ts (additional optimization)
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'db-vendor': ['dexie'],
          'ui-vendor': ['@headlessui/vue'],
          'date-vendor': ['date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 200, // Warn if chunk >200KB (aligns with constitutional budget)
  },
});

// router/index.ts (lazy loading)
const routes = [
  { path: '/', component: () => import('../views/HomeView.vue') },
  { path: '/questionnaire', component: () => import('../views/QuestionnaireView.vue') },
  { path: '/checklist', component: () => import('../views/ChecklistView.vue') },
  { path: '/settings', component: () => import('../views/SettingsView.vue') }, // Lazy-loaded
];
```

**Alternatives Considered**:
- **Server-side rendering (SSR)**: Rejected due to PWA offline-first requirement and constitutional prohibition on backend servers
- **Static site generation (SSG)**: Rejected due to dynamic user data requirements (checklists, preferences)
- **No optimization**: Rejected due to constitutional performance gates (Lighthouse ≥90, FCP <1.5s)

---

### 6. Category Type Behavior

**Decision**: Implement two category types (`daily` and `singular`) with distinct quantity calculation logic as outlined in Checklist Generation Algorithm section.

**Rationale**:
- **Daily categories** (clothes, toiletries) require per-day calculations accounting for trip duration, buffer days, and washing machine availability
- **Singular categories** (electronics, documents) are one-time items regardless of trip length
- Type distinction is explicit in data model and enforced by UI (e.g., "Daily Items" vs "Essentials" sections)

**UI Treatment**:
- Daily categories display per-day breakdown (e.g., "Day 1: 1 shirt, 1 top | Day 2: 1 shirt, 1 top")
- Singular categories display flat list (e.g., "✓ Phone charger | ✓ Passport")

**Alternatives Considered**:
- **Single unified category type**: Rejected due to inability to distinguish per-day vs one-off items
- **Three+ category types** (daily, weekly, singular): Rejected for MVP due to increased complexity without clear user value

---

### 7. Default Categories and Items Seed Data

**Decision**: Include a seed data JSON file with 5-7 default categories (Clothes, Toiletries, Electronics, Documents, Accessories) and 30-40 common items to provide immediate value on first app open.

**Rationale**:
- New users should not face a blank slate; default categories enable instant checklist generation
- Seed data aligns with common packing scenarios (business trip, beach vacation, weekend getaway)
- Users can customize/extend via Settings (FR-010 requirement)
- Reset-to-defaults (FR-011) restores this seed data

**Seed Data Example**:

```json
// db/seed.json
{
  "categories": [
    { "id": 1, "name": "Clothes", "type": "daily", "default_included": true, "sort_order": 1 },
    { "id": 2, "name": "Toiletries", "type": "daily", "default_included": true, "sort_order": 2 },
    { "id": 3, "name": "Electronics", "type": "singular", "default_included": true, "sort_order": 3 },
    { "id": 4, "name": "Documents", "type": "singular", "default_included": true, "sort_order": 4 },
    { "id": 5, "name": "Accessories", "type": "singular", "default_included": false, "sort_order": 5 }
  ],
  "items": [
    { "category_id": 1, "name": "T-shirt", "enabled": true },
    { "category_id": 1, "name": "Underwear", "enabled": true },
    { "category_id": 1, "name": "Socks", "enabled": true },
    { "category_id": 1, "name": "Formal shirt", "enabled": true },
    { "category_id": 1, "name": "Swimsuit", "enabled": true },
    { "category_id": 1, "name": "Shorts", "enabled": true },
    { "category_id": 2, "name": "Toothbrush", "enabled": true },
    { "category_id": 2, "name": "Toothpaste", "enabled": true },
    { "category_id": 2, "name": "Shampoo", "enabled": true },
    { "category_id": 2, "name": "Sunscreen", "enabled": true },
    { "category_id": 3, "name": "Phone charger", "enabled": true },
    { "category_id": 3, "name": "Laptop", "enabled": true },
    { "category_id": 3, "name": "Headphones", "enabled": true },
    { "category_id": 4, "name": "Passport", "enabled": true },
    { "category_id": 4, "name": "ID card", "enabled": true },
    { "category_id": 4, "name": "Travel tickets", "enabled": true }
  ]
}
```

**Alternatives Considered**:
- **Empty database on first open**: Rejected due to poor first-run experience and increased user friction
- **Wizard to create categories**: Rejected for MVP; seed data provides faster onboarding
- **Cloud-based template library**: Rejected per constitutional requirement for offline-first and no backend

---

## Summary

All research topics resolved with concrete decisions:

1. **IndexedDB Schema**: Dexie.js 4.x with 5 tables (template/instance separation), versioned migrations, TypeScript types
2. **Checklist Generation**: Rule-based algorithm with per-day calculations for `daily` categories, fixed quantities for `singular` categories
3. **Offline Persistence**: Vite PWA Plugin with Workbox `generateSW` + Dexie.js for user data
4. **PWA Installability**: Complete Web App Manifest, Service Worker, iOS meta tags
5. **Performance**: Bundle splitting, lazy routes, Tailwind purging, Lighthouse CI
6. **Category Types**: Two types (`daily`, `singular`) with distinct UI/UX treatment
7. **Seed Data**: 5-7 default categories, 30-40 items for first-run experience

**Next Steps**: Proceed to Phase 1 (data-model.md, contracts/, quickstart.md).
