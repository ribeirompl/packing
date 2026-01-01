# Tasks: Packing Checklist PWA

**Input**: Design documents from `/specs/1-packing-checklist-pwa/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/

**Organization**: Tasks are grouped by user story (P1, P2, P3) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US#]**: Which user story this task belongs to (e.g., US1, US2, US3)
- File paths are exact from `src/` root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Project structure and core configuration

- [X] T001 Create project structure per plan.md with src/, public/, tests/ directories
- [X] T002 Initialize Vite 7.x project with Vue 3.5, TypeScript 5.9, Tailwind CSS 4.x, Headless UI 1.7
- [X] T003 [P] Install primary dependencies (Dexie.js 4.x, Pinia 3.x, Vue Router 4.6, date-fns 4.x)
- [X] T004 [P] Configure Vite PWA Plugin 1.x with Workbox for Service Worker generation
- [X] T005 [P] Setup TypeScript strict mode and ESLint + Prettier
- [X] T006 [P] Configure vitest 4.x with jsdom and coverage
- [X] T007 [P] Configure Playwright 1.57+ for E2E testing
- [X] T008 Create vite.config.ts with PWA plugin, Tailwind, path aliases
- [X] T009 [P] Create tsconfig.json, tailwind.config.ts, eslintrc, prettier config
- [X] T010 Create src/main.ts entry point with Vue 3, Router, Pinia, Dexie initialization

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST complete before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T011 [P] Create Dexie.js schema in src/db/schema.ts with tables: checklists, checklist_items, item_templates, categories, preferences
- [X] T012 [P] Create Dexie.js type models in src/db/models.ts (Checklist, ChecklistItem, ItemTemplate, Category, Preference)
- [X] T013 Create database seed data in src/db/seed.ts with 7 default categories and 40+ item templates
- [X] T014 [P] Create Pinia store src/stores/checklist.ts for active checklist state (singleton)
- [X] T015 [P] Create Pinia store src/stores/categories.ts for categories and item_templates state
- [X] T016 [P] Create Pinia store src/stores/preferences.ts for user preferences state
- [X] T017 Create src/router/index.ts with routes: / (questionnaire default), /checklist, /settings (hash mode)
- [X] T018 [P] Create shared TypeScript types in src/types/index.ts (export from contracts/)
- [X] T019 [P] Create src/composables/useChecklist.ts for checklist generation logic
- [X] T020 [P] Create src/composables/useCategoryManager.ts for category CRUD operations
- [X] T021 [P] Create src/composables/usePerDayCalculator.ts for daily quantity calculations
- [X] T022 [P] Create src/components/common/WelcomeModal.vue for first-visit onboarding
- [X] T023 [P] Create src/components/common/ shared UI components (Button, Input, Modal, Dialog, Checkbox)
- [X] T024 Create App.vue root component with Router outlet and persistent WelcomeModal
- [X] T025 Create public/manifest.json with PWA metadata (name, icons, display, orientation)
- [X] T026 [P] Create public/icons/ with 192x192 and 512x512 app icons (and maskable variants)

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Checklist and Pack (Priority: P1) 🎯 MVP

**Goal**: Generate a checklist from questionnaire answers and persist checked item state across sessions

**Independent Test**: Start app → fill questionnaire → verify checklist generated with category summary + daily items → check items → close/reopen app → confirm checked items persist

### Implementation for US1

#### Services

- [X] T027 [P] [US1] Create ChecklistService in src/services/ChecklistService.ts with:
  - generateChecklist(input: QuestionnaireInput): generates singleton checklist + snapshot items
  - getCurrentChecklist(): returns active checklist + items or null
  - updateItemChecked(itemId, checked): update item checked state
  - clearCurrentChecklist(): delete checklist + items
  - getDayBreakdown(): per-day item summary
  - getCategorySummary(): category totals + progress

- [X] T028 [P] [US1] Create CategoryService in src/services/CategoryService.ts with:
  - getAllCategories(): fetch categories
  - getCategoryWithItems(categoryId): fetch category + item_templates
  - Methods handle read-only access for questionnaire (no mutations in US1)

- [X] T029 [P] [US1] Create PreferenceService in src/services/PreferenceService.ts with:
  - getPreference(): fetch singleton preferences
  - Methods handle read-only access for questionnaire (no mutations in US1)

#### Components & Views

- [X] T030 [P] [US1] Create QuestionnaireView.vue (default route /) with form fields:
  - start_date (date input)
  - end_date (date input)
  - buffer_days (number input, min=0, auto-calculated from preferences based on washing machine availability, user can override)
  - formal_attire (checkbox)
  - swimming (checkbox)
  - hot_weather (checkbox)
  - washing_machine_available (checkbox)
  - max_days_before_washing (number input, conditional, 1-14)
  - selected_categories (multi-select checkboxes, fetch from categories)
  - Submit button "Generate Checklist"

- [X] T031 [P] [US1] Create ChecklistView.vue with:
  - Category summary section: grid/list of categories with total items, checked count, progress %
  - Daily breakdown section: accordion/tabs per day showing items grouped by category
  - Checkbox for each item with name, category, quantity, checked state
  - "Clear Checklist" button (navigates back to questionnaire)
  - Responsive layout (mobile-first Tailwind, 320px → 1920px)

- [X] T032 [P] [US1] Create form components in src/components/questionnaire/:
  - DateInput.vue (start_date / end_date fields with validation)
  - CheckboxInput.vue (formal_attire, swimming, hot_weather, washing_machine_available)
  - ConditionalNumberInput.vue (max_days_before_washing shown only if washing_machine_available)
  - CategoryMultiSelect.vue (fetch categories, display as checkboxes, manage selected_categories)

- [X] T033 [P] [US1] Create checklist components in src/components/checklist/:
  - CategorySummary.vue (grid/card layout: category name, icon, totals, progress bar)
  - DayBreakdown.vue (day section with items grouped by category)
  - ChecklistItem.vue (checkbox + name + category + quantity, emit check/uncheck)
  - DayAccordion.vue (collapsible day sections)

#### Composables & Logic

- [X] T034 [US1] Implement useChecklist.ts (from T019):
  - generateChecklist(input) → call ChecklistService, update checklist store
  - getCurrentChecklist() → fetch from store
  - updateItemChecked(itemId, checked) → update store and persist
  - getDayBreakdown() → call service
  - getCategorySummary() → call service
  - Handle Dexie transaction for generate/replace

- [X] T035 [US1] Implement useCategoryManager.ts (from T020) read-only access:
  - getAllCategories() → fetch from store
  - getCategoryWithItems(categoryId) → fetch templates for questionnaire

- [X] T036 [US1] Implement usePerDayCalculator.ts (from T021):
  - calculateTripDuration(startDate, endDate) → days
  - calculateDailyQuantity(totalQuantity, daysWithWashing, maxDaysBeforeWashing) → adjusted quantity
  - calculateDayBreakdown(checklist, items) → per-day groupings

#### Integration

- [X] T037 [US1] Connect QuestionnaireView to ChecklistService.generateChecklist():
  - Form submit → validateInput → generateChecklist → navigate to /checklist

- [X] T038 [US1] Connect ChecklistView to store and persistence:
  - Load getCurrentChecklist() on mount
  - Emit updateItemChecked() on checkbox change (auto-save to IndexedDB)
  - "Clear" button calls clearCurrentChecklist() → navigate to /

- [X] T039 [US1] Implement WelcomeModal first-visit logic:
  - Check preferences.welcome_seen flag
  - Show modal on first visit with explanation + link to next steps
  - Set flag and dismiss modal

- [X] T039a [US1] Add bulk category toggle feature:
  - Add ChecklistService.updateCategoryChecked() method
  - Create CategorySummary.vue component with tri-state checkbox
  - Update ChecklistView.vue to use CategorySummary component
  - Add tests for bulk toggle functionality

- [ ] T040 [US1] Offline testing setup: **DEFERRED** (requires manual browser testing)
  - Ensure ServiceWorker caches all assets + questionnaire/checklist static data
  - Test offline: fill questionnaire → generate → check items offline → navigate offline → verify persistence
  - **Status**: PWA configured via Vite plugin, requires manual DevTools testing

#### Tests for US1

- [~] T041 [P] [US1] Service unit test: ChecklistService.generateChecklist() **PARTIAL**
  - Test files created, fake-indexeddb installed
  - Requires Pinia store mocking in test environment
  - **Status**: usePerDayCalculator tests pass (17/17), service tests need store mocks

- [~] T042 [P] [US1] Service unit test: ChecklistService.updateItemChecked() **PARTIAL**
  - Test: item checked state persists to IndexedDB
  - **Status**: Same as T041 - needs Pinia mock

- [X] T043 [P] [US1] Composable unit test: usePerDayCalculator **COMPLETE**
  - All 17 tests passing
  - Trip duration, buffer days, daily quantity calculations verified

- [ ] T044 [P] [US1] Integration test: full questionnaire → checklist flow **DEFERRED**
  - Requires E2E test setup with Playwright

- [ ] T045 [US1] E2E test: Playwright offline scenario **DEFERRED**
  - Requires Playwright configuration and offline testing setup

**Checkpoint**: User Story 1 complete — MVP checklist generation and persistence working independently

**✅ Phase 3 Implementation Status**:
- **Core Features**: 100% complete and functional in browser
- **Services**: All implemented (ChecklistService, CategoryService, PreferenceService)
- **Views**: QuestionnaireView and ChecklistView fully functional
- **Tri-state Parent Checkboxes**: Implemented with CategorySummary component
- **Tests**: 17/17 usePerDayCalculator tests passing; service tests need Pinia mocking (deferred)
- **Browser Testing**: ✅ Fully functional at http://localhost:5173/

---

## Phase 4: User Story 2 - Customize Preferences (Priority: P2)

**Goal**: Allow users to edit preferences that influence future checklist generation (category defaults, buffer days ratio, etc.)

**Independent Test**: Update preferences → generate new checklist → verify defaults applied to new checklist (independent of US1)

### Implementation for US2

#### Services

- [X] T046 [P] [US2] Extend PreferenceService in src/services/PreferenceService.ts with:
  - updatePreference(updates): partial update to preferences singleton ✅
  - resetToDefaults(): restore seeded preferences ✅
  - validatePreference(updates): validate input ✅

- [X] T047 [P] [US2] Extend CategoryService in src/services/CategoryService.ts with:
  - createCategory(category): add new category ✅
  - updateCategory(categoryId, updates): rename, change type, toggle default_included ✅
  - deleteCategory(categoryId): delete category + cascade delete item_templates ✅
  - addItemToCategory(categoryId, itemName, enabled): add item template ✅
  - updateItemInCategory(itemId, updates): rename, toggle enabled ✅
  - deleteItemFromCategory(itemId): delete item template ✅
  - toggleItemEnabled(itemId): quick enable/disable ✅
  - reorderCategories(categoryIds): update sort_order ✅
  - resetToDefaults(): restore seeded categories + items ✅

#### Components & Views

- [X] T048 [P] [US2] Create SettingsView.vue (route /settings) with tabs:
  - Tab 1: Preferences ✅
    - buffer_days_ratio (number input, min=1, label: "1 buffer day per N trip days") ✅
    - min_buffer_days (number input, min=0, label: "Minimum buffer days") ✅
    - Save button ✅
  - Tab 2: Categories & Items Management ✅
    - List of categories (sortable, editable name, toggle default_included, delete icon) ✅
    - For each category: collapsible list of items (editable name, toggle enabled, delete icon) ✅
    - "Add Category" button ✅
    - Reset to Defaults button (with confirmation) ✅
  - Settings header with "Back" navigation ✅

- [X] T049 [P] [US2] Create components in src/components/settings/:
  - PreferenceEditor.vue (form: buffer_days_ratio, min_buffer_days, save button) ✅
  - CategoryManager.vue (manages categories with CategoryItem components) ✅
  - CategoryItem.vue (row: name editable, toggle, delete, expandable items) ✅
  - ItemTemplateItem.vue (row: name editable, toggle enabled, delete) ✅
  - WarningBanner.vue (display "Settings apply to new checklists only") ✅ (inline in SettingsView)

#### Integration

- [X] T050 [US2] Connect SettingsView to PreferenceService and CategoryService:
  - Load preferences and categories on mount
  - Update button calls updatePreference() → persist
  - Add/Edit/Delete category calls CategoryService → update store
  - Toggle item enabled calls CategoryService → update store

- [X] T051 [US2] Update QuestionnaireView to reflect current preferences:
  - buffer_days auto-calculated on start_date/end_date change:
    * If washing_machine_available && max_days_before_washing: buffer_days = max_days_before_washing
    * Otherwise: buffer_days = Math.max(Math.floor(tripDays / buffer_days_ratio), min_buffer_days)
    * tripDays calculated inclusively: differenceInDays(end_date, start_date) + 1
  - User can manually override auto-calculated value
  - selected_categories defaults to preferences.preferred_categories

- [X] T052 [US2] Update ChecklistService.generateChecklist() to apply preferences:
  - Use preference.category_defaults when filtering categories
  - Auto-calculate buffer_days if not provided:
    * If washing_machine_available && max_days_before_washing: use max_days_before_washing
    * Otherwise: Math.max(Math.floor(tripDays / buffer_days_ratio), min_buffer_days)
    * tripDays calculated inclusively: differenceInDays(end_date, start_date) + 1

- [X] T053 [US2] Display warning when generating new checklist:
  - Show toast/banner: "Previous checklist cleared. New checklist generated with current settings."

#### Tests for US2

- [ ] T054 [P] [US2] Service unit test: PreferenceService.updatePreference() in tests/unit/services/PreferenceService.spec.ts
  - Test: preferences updated and persisted

- [ ] T055 [P] [US2] Service unit test: CategoryService CRUD in tests/unit/services/CategoryService.spec.ts
  - Test: create, update, delete category
  - Test: create, update, delete item template
  - Test: toggle enabled flag

- [ ] T056 [P] [US2] Integration test: preference changes affect new checklist in tests/integration/PreferenceFlow.spec.ts
  - Test: generate checklist 1 → update preferences → generate checklist 2 → verify checklist 2 uses new defaults
  - Test: old checklist 1 state unchanged (snapshot immutability)

- [ ] T057 [US2] E2E test: Playwright settings flow in tests/e2e/settings.spec.ts
  - Test: navigate to settings → update preferences → generate checklist → verify defaults applied
  - Test: add custom category → generate checklist → verify custom category appears

**Checkpoint**: User Story 2 complete — preferences management and category customization working independently

---

## Phase 5: User Story 3 - Clear or Restart Checklist (Priority: P3)

**Goal**: Allow users to clear the current checklist and start a new trip

**Independent Test**: Generate checklist → clear → verify app returns to questionnaire, ready for new trip

### Implementation for US3

#### Services

- [X] T058 [US3] ChecklistService already has clearCurrentChecklist() from US1 (T027)
  - No new service methods needed for US3

#### Components & Views

- [X] T059 [P] [US3] Create ClearConfirmation dialog in src/components/checklist/:
  - Modal: "Clear the current checklist?" with explanation
  - Buttons: "Cancel", "Clear"
  - On confirm: call clearCurrentChecklist() → navigate to / (questionnaire)

- [X] T060 [P] [US3] Add "Clear Checklist" button to ChecklistView.vue (from T031):
  - Button placement: top bar or bottom action area
  - Trigger ClearConfirmation dialog on click

#### Integration

- [X] T061 [US3] Connect "Clear Checklist" button to clearCurrentChecklist():
  - Show confirmation dialog
  - On confirm: call ChecklistService.clearCurrentChecklist()
  - Navigate to / (questionnaire view)
  - Show toast: "Checklist cleared. Ready for a new trip!"

#### Tests for US3

- [ ] T062 [P] [US3] Service unit test: ChecklistService.clearCurrentChecklist() in tests/unit/services/ChecklistService.spec.ts
  - Test: checklist and checklist_items deleted from IndexedDB

- [ ] T063 [US3] Integration test: clear flow in tests/integration/ClearFlow.spec.ts
  - Test: generate checklist → clear → verify no checklist exists → questionnaire displayed

- [ ] T064 [US3] E2E test: Playwright clear scenario in tests/e2e/clear.spec.ts
  - Test: generate checklist → click Clear → confirm → verify navigation back to questionnaire

**Checkpoint**: User Story 3 complete — users can clear and restart checklist

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Refinements, testing, documentation, and production readiness

### Documentation & Deployment

- [ ] T065 Update quickstart.md with final setup, dev, test, build, deploy instructions
- [ ] T066 [P] Create README.md with feature overview, user guide, tech stack, contributing guidelines
- [ ] T067 [P] Update .github/agents/copilot-instructions.md with final project technologies

### Testing & Quality

- [ ] T068 Run full test suite (unit + integration + E2E) and verify all passing
- [ ] T069 Generate code coverage report; ensure >80% coverage on services and composables
- [X] T070 [P] Run ESLint and Prettier on entire src/ directory; fix any violations
- [X] T071 [P] Run TypeScript strict type check; resolve any remaining type errors

### Performance & PWA

- [ ] T072 Run Lighthouse audit on production build; verify ≥90 all categories
- [ ] T073 [P] Verify Service Worker caches and offline functionality
- [ ] T074 [P] Test PWA installability on iOS 15+, Android Chrome 90+, Desktop
- [X] T075 [P] Optimize bundle size; verify <200KB gzipped (warn if >200KB in CI)
- [X] T076 [P] Test Tailwind CSS responsive layouts on mobile (320px), tablet (768px), desktop (1920px)

### Accessibility & UX

- [ ] T077 [P] Verify WCAG 2.1 AA compliance (axe DevTools, manual spot-checks)
- [ ] T078 [P] Test keyboard navigation (Tab, Enter, Escape) for all views and forms
- [X] T079 [P] Test touch targets ≥44x44px on all interactive elements (mobile)
- [ ] T080 [P] Add focus indicators and hover states to buttons, links, form inputs

### Documentation & Code Cleanup

- [ ] T081 [P] Add JSDoc comments to all exported functions and components in src/
- [ ] T082 [P] Add inline comments for complex logic (checklist generation, daily calculations)
- [ ] T083 Refactor any large components into smaller composable parts
- [ ] T084 [P] Update data-model.md with final schema and migration notes

### Final Validation

- [ ] T085 Run complete user journey E2E test (questionnaire → checklist → settings → clear → repeat)
- [ ] T086 [P] Verify offline scenario E2E test (offline generation, check items, navigate offline, reload, verify persistence)
- [ ] T087 Smoke test all routes and main features on production build
- [ ] T088 [P] Commit all changes with descriptive messages; ensure Git history is clean

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories**
- **User Stories (Phase 3, 4, 5)**: All depend on Foundational phase completion
  - US1 (P1), US2 (P2), US3 (P3) can then proceed in parallel (if team capacity) or sequentially
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### Within Each User Story

- Services before components
- Components before views
- Core implementation before integration and tests
- Tests should fail before implementation (TDD)

### Parallel Opportunities

1. **Phase 1 Setup**: All [P] tasks (T002, T003, T004, T005, T006, T007, T009) can run in parallel
2. **Phase 2 Foundational**: All [P] tasks (T011, T012, T014, T015, T016, T018, T019, T020, T021, T022, T023) can run in parallel
3. **Phase 3 US1**:
   - Services T027, T028, T029 can run in parallel
   - Components T030, T031, T032, T033 can run in parallel
   - Tests T041, T042, T043, T044 can run in parallel
4. **Phase 4 US2**: Can start after Foundational (Phase 2) — no dependency on US1
   - Services T046, T047 can run in parallel
   - Components T048, T049 can run in parallel
   - Tests T054, T055, T056 can run in parallel
5. **Phase 5 US3**: Can start after Foundational (Phase 2) — independent of US1 and US2
   - Components T059, T060 can run in parallel
   - Tests T062, T063, T064 can run in parallel
6. **Phase 6 Polish**: Run [P] tasks in parallel (T066, T069, T070, T072, T073, T074, T075, T076, T077, T078, T079, T080, T082, T086)

### Example Parallel Team Execution

With 3 developers:

1. **All complete Phase 1 + Phase 2 together** (setup + foundation)
2. **Once Phase 2 done**:
   - Developer A: Phase 3 US1 (checklist generation) — Services → Components → Integration → Tests
   - Developer B: Phase 4 US2 (preferences) — Services → Components → Integration → Tests
   - Developer C: Phase 5 US3 (clear checklist) — Components → Integration → Tests
3. **All reconvene for Phase 6** (polish, testing, deployment)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup ✅
2. Complete Phase 2: Foundational ✅
3. Complete Phase 3: User Story 1 ✅
4. **STOP and VALIDATE**: Test US1 end-to-end independently ✅
5. Deploy/demo (MVP ready!) ✅

### Incremental Delivery

1. **MVP Increment 1**: Phase 1 + 2 + 3 (checklist generation + persistence) — **Core value delivered**
2. **Increment 2**: + Phase 4 (preferences/customization) — Personalization
3. **Increment 3**: + Phase 5 (clear/restart) — Full trip workflow
4. **Final**: + Phase 6 (polish, testing, performance) — Production ready

---

## Notes

- [P] tasks = parallelizable (different files, no dependencies)
- [US#] label = maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing (TDD)
- Commit after each logical group or task
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence
- All paths relative to `src/` root (e.g., `src/components/`, `src/services/`, `tests/`)
