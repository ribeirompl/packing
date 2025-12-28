# Feature Specification: Packing Checklist PWA

**Feature Branch**: `1-packing-checklist-pwa`
**Created**: 2025-12-27
**Status**: Draft
**Input**: User description: "PWA app assisting with packing for trips: asks predefined selections (formal attire, start/end date, extra days, swimming, hot weather), generates a checklist organized by categories and daily items, saves checked items locally for persistence, allows clearing and user preferences."

## Clarifications

### Session 2025-12-28

- Q: FR-009: Persistence scope → A: Local-only persistence on the current device (MVP). Cloud/account sync is out-of-scope for the initial release; can be considered later as an opt-in feature.
- Q: FR-008: Daily itemization behavior → B: Per-day quantities only (MVP). The app will show counts per day (e.g., "Day 1: 1 shirt, 1 top"); assigning specific items to named days is out-of-scope for the initial release.
- Q: FR-010: Preferences depth → A: Small set of toggles and defaults (MVP). Preferences will include `default_extra_days`, `preferred_categories`, and `include_optional_categories`; custom item templates and advanced category management are out-of-scope for the initial release.
- Q: FR-010: Preferences depth → Updated: Users can create and manage categories and items (MVP extended). Users may create, rename, and delete categories; categories include a `type` (`daily` or `singular`) and a `default_included` flag. Users can add/remove items within categories and toggle items on/off in settings. The questionnaire will reflect category defaults and inclusion state.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create checklist and pack (Priority: P1)

A user opens the PWA to prepare for a trip, answers a short questionnaire (formal attire needed, trip start and end dates, extra days of clothes, swimming, hot weather, etc.), and the app generates a categorized packing checklist plus a daily itemized view. The user checks items as they pack; checked items remain saved if the app/browser is closed and reopened.

**Why this priority**: This is the core value: quickly produce a practical checklist and persist progress across sessions.

**Independent Test**: Start the app, complete the questionnaire, verify checklist is generated with category summary and daily items, check several items, close the app/browser, reopen and confirm checked items remain.

**Acceptance Scenarios**:

1. **Given** the user opens the app and answers the questionnaire, **When** they submit, **Then** a checklist is generated with category totals and a detailed daily list.
2. **Given** the user checks several items and closes the browser, **When** they reopen the app, **Then** the previously checked items are still checked.
3. **Given** the user views the top summary, **When** they expand categories, **Then** they see item counts matching the detailed list.

---

### User Story 2 - Customize preferences (Priority: P2)

A user configures simple preferences (e.g., default extra days, preferred categories or toggling optional categories like "toiletries") which influence future checklist generation.

**Why this priority**: Personalization reduces repetitive inputs and speeds up checklist creation for frequent users.

**Independent Test**: Update preferences, create a new checklist, verify defaults are applied.

**Acceptance Scenarios**:

1. **Given** the user changes default extra-days to +1 and saves preferences, **When** they create a new checklist, **Then** the generated quantities incorporate the new default.

---

### User Story 3 - Clear or restart checklist (Priority: P3)

A user can clear the current checklist and start a new one.

**Why this priority**: Enables reuse for multiple trips without persisting historical data.

**Independent Test**: Generate a checklist, use the "Clear" action, and confirm the app resets to initial questionnaire state.

**Acceptance Scenarios**:

1. **Given** an active checklist exists, **When** the user taps "Clear checklist", **Then** all checked states and items are removed and the app returns to questionnaire.

---

### Edge Cases

- What happens if the start date is after the end date? (validate input and show error)
- Very long trips (30+ days): ensure quantities and UI remain usable
- Multiple reopenings and offline use: ensure persistence is robust to network changes

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present a short questionnaire capturing: need for formal attire, start date, end date (or days count), optional extra-days to pack, swimming, hot weather, washing machine availability, and maximum days before washing (if washing machine available), plus optional toggles for common categories (e.g., toiletries, electronics).
-- **FR-002**: The system MUST generate a categorized checklist based on questionnaire answers, including a summary at the top with totals per category (e.g., clothes, toiletries, electronics) and a detailed per-day quantities list below (e.g., "Day 1: 1 shirt, 1 top"). Assigning specific items to named days is out-of-scope for the MVP.
- **FR-003**: The system MUST allow users to check/uncheck individual items in the checklist.
- **FR-004**: The system MUST persist the checked/unchecked state and the current checklist so that closing and reopening the app/browser restores the state.
- **FR-005**: The system MUST provide an action to clear the current checklist and start a new one.
- **FR-006**: The system MUST allow users to edit simple preferences that influence future checklist generation (e.g., default extra-days, preferred categories).
 - **FR-006**: The system MUST allow users to edit preferences that influence future checklist generation. Preferences MUST let the user choose which categories are shown in the questionnaire and the default include/exclude state for each category (for example, show `Clothes` included, `Toiletries` excluded by default). Preferences also include `default_extra_days` and other simple defaults.
- **FR-007**: The system MUST validate questionnaire inputs (e.g., start date ≤ end date) and surface clear, actionable validation messages to the user.

- **FR-011**: The system MUST provide an action in settings to reset all categories, items, and preference values back to the original default configuration (undoing user edits and restores initial defaults).

*Marked clarifications*:
- **FR-008**: Daily itemization behavior: The system WILL present per-day quantities only for the MVP (e.g., "Day 1: 1 shirt, 1 top"); assigning specific, named items to particular days is out-of-scope for the initial release.
- **FR-009**: Persistence scope: The system WILL persist the checked/unchecked state and the current checklist locally on the current device (local-only) for the MVP; optional cloud/account sync is out-of-scope for the initial release and may be considered later as an opt-in enhancement.
 - **FR-010**: Preferences depth: The system WILL support user-created categories and items for the feature. Users MUST be able to create, rename, and delete categories and add/remove items within those categories. Categories MUST have a `type` attribute (at minimum: `daily` for items that map to per-day quantities, and `singular` for one-off items such as chargers or toiletries). Users MUST be able to toggle individual items on/off within category settings to include/exclude them from generation. Default preferences (which categories are shown and whether they are included by default) MUST be editable by the user.

### Key Entities *(include if feature involves data)*

- **Checklist**: Represents a generated packing list for a trip; attributes: `title` (auto-generated from dates/location if provided), `start_date`, `end_date`, `extra_days`, `categories`, `items`, `created_at`.
- **Item**: Single checklist item; attributes: `name`, `category`, `quantity`, `assigned_day` (optional — reserved for future per-item day assignment; not used in MVP), `checked` (boolean), `enabled` (boolean — whether item is included by default in generation for its category).
- **Category**: Logical grouping for items (e.g., Clothes, Toiletries, Electronics). Attributes: `name`, `type` (e.g., `daily` | `singular` | other), `items` (list of Item ids), `default_included` (boolean indicating if category is included by default in the questionnaire).
- **Preference**: User preferences affecting generation; attributes: `default_extra_days`, `category_defaults` (mapping of category id → default_included boolean), `preferred_categories` (ordered list), `include_optional_categories`.
 - **Item Management**: Users can create, rename, and delete items within any category. Each `Item` has an `enabled` flag (whether it is included in generation by default for that category) and is editable via settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the questionnaire and view a generated checklist within 2 minutes (measured in a usability test).
- **SC-002**: After checking items and fully closing the app/browser, 100% of checked items persist and remain checked on reopen in automated/manual tests of typical usage.
- **SC-003**: 95% of users in a small usability trial can generate a checklist and mark at least one item as packed without assistance.
- **SC-004**: The primary flows (generate, check items, clear) are usable offline for the duration of a session (user can check/uncheck items while offline and state is preserved when connectivity is restored).

## Assumptions

- The app is intended for single-device use by a single user; no multi-user collaboration or history storage is required by default.
- Persistence is required only for the current checklist and will be local-only on the current device for the MVP; cloud/account sync is out-of-scope for the initial release.
- The UI will prioritize clarity and quick actions (generate checklist, quick-check items), not advanced outfit planning.

## Non-goals

- Long-term history of past checklists and analytics (no history required).
- Multi-user sharing or collaboration on a checklist (out of scope for initial MVP).

## Next Steps

- Resolve up to three clarification questions embedded in FR-008, FR-009, FR-010. These affect scope and UX; see the checklist validation output for structured questions.
- After clarifications, finalise requirements and acceptance tests, then proceed to planning and implementation.
