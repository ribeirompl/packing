# Implementation Plan: Packing Checklist PWA

**Branch**: `1-packing-checklist-pwa` | **Date**: 2025-12-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/1-packing-checklist-pwa/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

A fully offline-capable Progressive Web App that helps users prepare for trips by generating a packing checklist based on a questionnaire (trip dates, formal attire, swimming, hot weather, washing machine availability, buffer days, etc.). The app maintains a single active checklist at a time (singleton pattern). Users manage custom categories/items, check off items as they pack, and have all progress persist locally via IndexedDB. The app features per-day quantity calculations with buffer days auto-calculated from user preferences. Buffer days calculation: if washing machine available with max_days_before_washing specified, buffer_days = max_days_before_washing; otherwise use ratio-based calculation: Math.max(Math.floor(tripDays / buffer_days_ratio), min_buffer_days). Trip duration is calculated inclusively (differenceInDays(end, start) + 1). The app works entirely client-side without backend dependencies.

**Architecture Note**: Only one checklist exists at a time. Generating a new checklist replaces the existing one. Checklist generation creates independent snapshots of items from current category/item templates, so settings changes don't affect the active checklist.

**Buffer Days**: User enters start_date and end_date first. The app auto-calculates buffer_days using preferences (buffer_days_ratio + min_buffer_days), but user can manually override in the questionnaire.

## Technical Context

**Language/Version**: TypeScript 5.9+ with ES2022+ features, strict mode enabled
**Primary Dependencies**: Vue 3.5+ (Composition API with `<script setup>`), Dexie.js 4.x (IndexedDB wrapper), Vite 7.x (build tool), Vite PWA Plugin 1.x (service worker generation with Workbox), Pinia 3.x (state management), Vue Router 4.6+ (routing with hash mode), date-fns 4.x (date calculations), Tailwind CSS 4.x (styling with flex-based responsive layout), Headless UI 1.7+ (accessible components)
**Storage**: IndexedDB via Dexie.js as single source of truth (stores Checklist, ChecklistItem, ItemTemplate, Category, Preference tables with clear separation between templates and generated instances)
**Testing**: Vitest 4.x (unit/integration with jsdom), Playwright 1.57+ (E2E PWA testing including offline scenarios)
**Target Platform**: PWA installable on iOS Safari 15+, Android Chrome 90+, Desktop Chrome/Edge/Firefox latest
**Project Type**: pwa-client-only (no backend, fully client-side)
**Performance Goals**: Lighthouse ≥90 all categories, First Contentful Paint <1.5s, Time to Interactive <3.5s, Largest Contentful Paint <2.5s, Sync debounce 2s for checklist updates
**Constraints**: Initial JS bundle target ~200KB gzipped (CI warns if >200KB), offline-capable after initial load, touch targets ≥44x44px, works on 4G throttled
**Scale/Scope**: Single-user local-only app, ~10 categories, ~100 items per checklist

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Mobile-First & Offline-First ✅ PASS

- **Questionnaire, checklist generation, and item checking fully functional offline** after initial app load via Service Worker cache
- **Mobile viewport primary target** with responsive flex-based Tailwind layouts (320px → 1920px)
- **Touch targets ≥44x44px** enforced via Tailwind custom utilities for buttons, checkboxes, and interactive elements
- **Service Worker caches** all critical assets (HTML, JS, CSS, icons) and static data (default categories/items JSON)
- **IndexedDB persists** all user data offline (checklists, preferences, custom categories/items)
- **Offline testing** explicitly required via Playwright E2E scenarios (create checklist offline, check items offline, verify persistence)

**Compliance**: Full alignment. Feature designed offline-first from inception.

---

### II. Client-Side Storage Architecture ✅ PASS

- **IndexedDB via Dexie.js 4.x** is the single source of truth for all application data
- **Schema includes**: `checklists`, `checklist_items` (instances), `item_templates` (settings), `categories`, `preferences` tables with versioned migrations separating templates from generated checklist instances
- **All CRUD operations** work fully offline against IndexedDB with no server dependency
- **Versioned schema migrations** handled via Dexie.js version API (e.g., v1 → v2 adds `washing_machine_available` field)
- **No localStorage for sensitive data**; IndexedDB ensures structured, queryable, transactional storage

**Compliance**: Full alignment. Dexie.js enforces typed schema and migration patterns per constitution.

---

### III. PWA Standards Compliance ✅ PASS

- **Web App Manifest** includes all required fields: `name`, `short_name`, `icons` (192x192, 512x512), `theme_color`, `background_color`, `display: standalone`
- **Service Worker** registered via Vite PWA Plugin 1.x using `generateSW` strategy with Workbox runtime caching
- **HTTPS** required for production; localhost development exempt
- **Installable** on iOS Safari 15+, Android Chrome 90+, Desktop (Chrome/Edge/Firefox)
- **App-like experience**: standalone display mode removes browser chrome; app behaves like native
- **Responsive design**: Tailwind mobile-first breakpoints (sm:, md:, lg:) with fluid flex layouts
- **Touch targets ≥44x44px**: enforced via `min-h-[44px] min-w-[44px]` Tailwind utilities
- **Fast load times**: FCP <1.5s, LCP <2.5s, TTI <3.5s per Technical Context performance goals
- **Lighthouse audit ≥90** all categories required before feature merge

**Compliance**: Full alignment. PWA standards enforced via Vite PWA Plugin and Lighthouse gate.

---

### IV. Privacy & Data Control ✅ PASS

- **No backend, no analytics, no tracking**: fully client-side PWA with no external scripts
- **User data never leaves device**: IndexedDB storage is local-only per FR-009 clarification
- **One-action data deletion**: FR-011 requires "Reset to defaults" action in settings that clears all user data
- **No third-party scripts**: only first-party dependencies (Vue, Dexie, Tailwind, etc.); no Google Analytics, Sentry, or external CDNs
- **User owns data**: app provides transparency via clear data model and reset action

**Compliance**: Full alignment. Privacy-first design with explicit user control via reset feature.

---

### Technology Stack ✅ PASS

**Core Technologies** (all present):
- ✅ TypeScript 5.9+ with ES2022+, strict mode
- ✅ IndexedDB via Dexie.js 4.x with typed API and migrations
- ✅ Service Worker via Vite PWA Plugin 1.x with Workbox `generateSW`
- ✅ Web App Manifest with all required fields
- ✅ Tailwind CSS 4.x with mobile-first breakpoints and custom touch utilities
- ✅ Vite 7.x for fast dev, HMR, optimized builds

**Optional Libraries** (all approved):
- ✅ Vue 3.5+ (Composition API with `<script setup>`) for complex state/routing
- ✅ Pinia 3.x for global state management (preferences, categories)
- ✅ Vue Router 4.6+ with hash mode for PWA compatibility
- ✅ date-fns 4.x for date calculations (tree-shakeable, immutable)
- ✅ Headless UI 1.7+ for accessible components (dialogs, toggles)
- ✅ Vitest 4.x for unit/integration testing with jsdom
- ✅ Playwright 1.57+ for E2E PWA testing with offline scenarios

**Prohibited** (none violated):
- ✅ No backend servers or APIs (fully client-side)
- ✅ No React, Angular, or large frameworks (using Vue 3 as approved)
- ✅ No jQuery or legacy libraries
- ✅ No Vue 2.x or Options API (using Composition API with `<script setup>`)
- ✅ No Vuex (using Pinia 3.x per constitution)
- ✅ No class components (using functional composition)
- ✅ No Moment.js or Day.js (using date-fns 4.x for tree-shaking)
- ✅ No localStorage for sensitive data (using IndexedDB)

**Compliance**: Full alignment. All dependencies match constitutional requirements.

---

### Quality Gates ✅ PASS

All quality gates from constitution explicitly met:
- ✅ Lighthouse ≥90 all categories (Performance, Accessibility, Best Practices, SEO, PWA)
- ✅ Installable on iOS Safari 15+ and Android Chrome 90+
- ✅ Works offline after initial load (Service Worker caches all critical assets)
- ✅ IndexedDB schema versioned with Dexie.js migrations tested
- ✅ TypeScript strict mode with no type errors
- ✅ No console errors/warnings in production build
- ✅ Performance budget: ~200KB gzipped initial JS (CI warns if >200KB)
- ✅ Performance: FCP <1.5s, LCP <2.5s, TTI <3.5s on 4G throttled
- ✅ Responsive: 320px → 1920px with mobile-first CSS
- ✅ Touch targets ≥44x44px (WCAG 2.1 Level AAA)

**Compliance**: Full alignment. All gates mapped to Technical Context and will be verified in testing phase.

---

**OVERALL RESULT**: ✅ **PASS** — Feature fully complies with all constitutional principles. No violations requiring justification. Proceed to Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/1-packing-checklist-pwa/
├── spec.md              # Feature specification (user scenarios, requirements, entities)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output: PWA patterns, IndexedDB design, checklist algorithms
├── data-model.md        # Phase 1 output: Dexie.js schema with TypeScript types
├── quickstart.md        # Phase 1 output: setup, dev, build, test commands
├── contracts/           # Phase 1 output: TypeScript interfaces for services and stores
│   ├── IChecklistService.ts
│   ├── ICategoryService.ts
│   ├── IPreferenceService.ts
│   └── types.ts         # Shared TypeScript types for all entities
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packing/                  # Repository root
├── src/
│   ├── assets/          # Static assets (icons, images, fonts)
│   │   └── icons/       # PWA icons (192x192, 512x512, maskable)
│   ├── components/      # Vue 3 components (Composition API)
│   │   ├── common/      # Shared UI components (buttons, inputs, modals, WelcomeModal.vue)
│   │   ├── questionnaire/  # Questionnaire form components
│   │   ├── checklist/   # Checklist display and item management
│   │   └── settings/    # Category/item management and preferences
│   ├── composables/     # Vue 3 composables (shared logic)
│   │   ├── useChecklist.ts      # Checklist generation logic
│   │   ├── useCategoryManager.ts # Category CRUD operations
│   │   └── usePerDayCalculator.ts # Per-day quantity calculations
│   ├── db/              # IndexedDB via Dexie.js
│   │   ├── schema.ts    # Dexie.js database schema and version migrations
│   │   ├── models/      # TypeScript types for tables
│   │   └── seed.ts      # Default categories and items data
│   ├── router/          # Vue Router 4 configuration (hash mode)
│   │   └── index.ts     # Routes: / (questionnaire default), /checklist, /settings
│   ├── stores/          # Pinia 3 state management
│   │   ├── checklist.ts # Active checklist state
│   │   ├── categories.ts # Categories and items state
│   │   └── preferences.ts # User preferences state
│   ├── services/        # Business logic services
│   │   ├── ChecklistService.ts  # Generate checklist from questionnaire
│   │   ├── CategoryService.ts   # Category/item CRUD
│   │   └── PreferenceService.ts # Preference management
│   ├── views/           # Vue Router view components
│   │   ├── QuestionnaireView.vue # Trip questionnaire form (default route with first-visit welcome modal)
│   │   ├── ChecklistView.vue     # Generated checklist display
│   │   └── SettingsView.vue      # Category/item/preference management
│   ├── App.vue          # Root Vue component
│   ├── main.ts          # App entry point (Vue 3, Router, Pinia, Dexie setup)
│   └── vite-env.d.ts    # Vite TypeScript declarations
├── public/              # Static public assets (served as-is)
│   ├── favicon.ico
│   ├── manifest.json    # Web App Manifest (PWA metadata)
│   └── robots.txt
├── tests/               # Testing
│   ├── unit/            # Vitest unit tests (composables, services)
│   ├── integration/     # Vitest integration tests (Dexie.js, stores)
│   └── e2e/             # Playwright E2E tests (offline scenarios, PWA install)
│       ├── checklist.spec.ts
│       ├── offline.spec.ts
│       └── preferences.spec.ts
├── index.html           # HTML entry point (loads main.ts)
├── vite.config.ts       # Vite configuration (PWA plugin, Tailwind, path aliases)
├── tailwind.config.ts   # Tailwind CSS configuration (mobile-first, touch utilities)
├── tsconfig.json        # TypeScript configuration (strict mode, ES2022+)
├── tsconfig.node.json   # TypeScript for Vite config
├── vitest.config.ts     # Vitest configuration (jsdom, coverage)
├── playwright.config.ts # Playwright configuration (browsers, offline mode)
├── package.json         # Dependencies and scripts
└── README.md            # Project overview and quickstart
```

**Structure Decision**: Single PWA client-only project (Option 1 adapted for Vue 3 SPA). No backend, no mobile native apps. All source code in `src/` with clear separation of concerns: Vue components in `components/` and `views/`, business logic in `services/` and `composables/`, IndexedDB in `db/`, state management in `stores/` (Pinia), routing in `router/`. Tests organized by type (unit, integration, E2E) to match constitution testing requirements.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations detected. This section is intentionally empty.
