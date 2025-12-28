/**
 * Checklist Service Interface
 *
 * Handles checklist generation, retrieval, and management
 */

import type {
  Checklist,
  ChecklistItem,
  QuestionnaireInput,
  ChecklistWithItems,
  DayBreakdown,
  CategorySummary,
  Result,
  ValidationError,
} from './types';

export interface IChecklistService {
  /**
   * Generate a new checklist from questionnaire input
   *
   * @param input - Questionnaire data from user
   * @returns Result with generated checklist and items
   * @throws ValidationError if input validation fails
   *
   * Business logic:
   * - Calculate trip duration from start/end dates
   * - Apply washing machine factor to daily item quantities
   * - Filter items based on conditional flags (formal_attire, swimming, hot_weather)
   * - Replace existing checklist (singleton - only one checklist exists at a time)
   * - Generate ChecklistItem instances by copying enabled ItemTemplates with calculated quantities
   * - Snapshot category names for display (in case category is later deleted/renamed in settings)
   *
   * Note: Replaces any existing checklist. Generated items are immutable snapshots.
   */
  generateChecklist(input: QuestionnaireInput): Promise<Result<ChecklistWithItems, ValidationError>>;

  /**
   * Get the current active checklist (singleton)
   *
   * @returns Result with current checklist and items, or null if no checklist exists
   */
  getCurrentChecklist(): Promise<Result<ChecklistWithItems | null, Error>>;

  /**
   * Update item checked state (user packs/unpacks item)
   *
   * @param itemId - ChecklistItem primary key
   * @param checked - New checked state
   * @returns Result with updated checklist item
   */
  updateItemChecked(itemId: number, checked: boolean): Promise<Result<ChecklistItem, Error>>;

  /**
   * Clear/delete the current checklist and all its items
   *
   * @returns Result indicating success
   */
  clearCurrentChecklist(): Promise<Result<void, Error>>;

  /**
   * Get per-day breakdown of items for current checklist (FR-002 requirement)
   *
   * @returns Result with array of day breakdowns
   *
   * Each day includes:
   * - Day number (1-indexed)
   * - Date (calculated from start_date + day offset)
   * - Items grouped by category with quantities
   */
  getDayBreakdown(): Promise<Result<DayBreakdown[], Error>>;

  /**
   * Get category summary for current checklist (totals, progress)
   *
   * @returns Result with array of category summaries
   *
   * Each summary includes:
   * - Category name
   * - Total items in category
   * - Checked items count
   * - Progress percentage (0-100)
   */
  getCategorySummary(): Promise<Result<CategorySummary[], Error>>;

  /**
   * Validate questionnaire input before generation
   *
   * @param input - Questionnaire data
   * @returns Array of validation errors (empty if valid)
   *
   * Validation rules:
   * - start_date <= end_date
   * - buffer_days: non-negative integer (no upper limit)
   * - max_days_before_washing: 1-14 range if washing_machine_available
   * - selected_categories: at least 1 category
   */
  validateQuestionnaireInput(input: QuestionnaireInput): ValidationError[];
}
