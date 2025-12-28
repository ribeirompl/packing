/**
 * Preference Service Interface
 *
 * Handles user preference management (singleton pattern, id always 1)
 */

import type {
  Preference,
  Result,
  ValidationError,
} from './types';

export interface IPreferenceService {
  /**
   * Get current user preferences (singleton, always returns id: 1)
   *
   * @returns Result with preference object
   *
   * If no preferences exist (first app open), returns default preferences:
   * - buffer_days_ratio: 7 (1 buffer day per 7 trip days)
   * - min_buffer_days: 1
   * - category_defaults: all categories with their default_included values
   * - preferred_categories: all categories sorted by sort_order
   */
  getPreferences(): Promise<Result<Preference, Error>>;

  /**
   * Update user preferences (partial update)
   *
   * @param updates - Partial preference data to update
   * @returns Result with updated preference object
   *
   * Common use cases:
   * - Update buffer_days_ratio and min_buffer_days in settings
   * - Toggle category default_included state in settings
   * - Reorder preferred_categories in settings
   */
  updatePreferences(
    updates: Partial<Omit<Preference, 'id'>>
  ): Promise<Result<Preference, ValidationError>>;

  /**
   * Update category default included state (shorthand for common operation)
   *
   * @param categoryId - Category primary key
   * @param defaultIncluded - New default_included state
   * @returns Result with updated preference object
   *
   * Updates category_defaults[categoryId] = defaultIncluded
   */
  updateCategoryDefault(
    categoryId: number,
    defaultIncluded: boolean
  ): Promise<Result<Preference, Error>>;

  /**
   * Update preferred category order (for UI sorting)
   *
   * @param categoryIds - Array of category IDs in new order
   * @returns Result with updated preference object
   *
   * Updates preferred_categories field
   */
  updatePreferredCategories(categoryIds: number[]): Promise<Result<Preference, Error>>;

  /**
   * Reset preferences to defaults (part of FR-011 reset operation)
   *
   * @returns Result with reset preference object
   *
   * Resets to:
   * - buffer_days_ratio: 7
   * - min_buffer_days: 1
   * - category_defaults: loaded from current categories' default_included values
   * - preferred_categories: current categories sorted by sort_order
   */
  resetToDefaults(): Promise<Result<Preference, Error>>;

  /**
   * Validate preference data before update
   *
   * @param preferences - Preference data to validate
   * @returns Array of validation errors (empty if valid)
   *
   * Validation rules:
   * - buffer_days_ratio: positive integer (minimum 1, no upper limit)
   * - min_buffer_days: non-negative integer (no upper limit)
   * - category_defaults: object with integer keys
   * - preferred_categories: array of integers (valid category IDs)
   */
  validatePreferences(preferences: Partial<Preference>): ValidationError[];
}
