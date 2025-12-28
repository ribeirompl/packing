/**
 * Category Service Interface
 *
 * Handles category and item template management (CRUD operations for settings)
 */

import type {
  Category,
  ItemTemplate,
  CategoryWithItems,
  Result,
  ValidationError,
} from './types';

export interface ICategoryService {
  /**
   * Get all categories (sorted by sort_order ASC)
   *
   * @returns Result with array of categories
   */
  getAllCategories(): Promise<Result<Category[], Error>>;

  /**
   * Get category by ID with item templates
   *
   * @param categoryId - Category primary key
   * @returns Result with category and item templates
   *
   * Note: Item templates are editable blueprints for checklist generation.
   * Changes to templates only affect future checklists, not existing ones.
   */
  getCategoryWithItems(categoryId: number): Promise<Result<CategoryWithItems, Error>>;

  /**
   * Create new category
   *
   * @param category - Category data (without id)
   * @returns Result with created category (including generated id)
   */
  createCategory(category: Omit<Category, 'id'>): Promise<Result<Category, ValidationError>>;

  /**
   * Update existing category
   *
   * @param categoryId - Category primary key
   * @param updates - Partial category data to update
   * @returns Result with updated category
   */
  updateCategory(
    categoryId: number,
    updates: Partial<Omit<Category, 'id'>>
  ): Promise<Result<Category, ValidationError>>;

  /**
   * Delete category and all associated item templates
   *
   * @param categoryId - Category primary key
   * @returns Result indicating success
   *
   * Warning: This operation cascades to delete all item templates in the category
   * User should be prompted for confirmation before calling
   */
  deleteCategory(categoryId: number): Promise<Result<void, Error>>;

  /**
   * Add item template to category
   *
   * @param categoryId - Category primary key
   * @param itemName - Item name
   * @param enabled - Whether item is included by default (default: true)
   * @returns Result with created item template
   *
   * Note: Templates are editable in settings. Changes only affect future checklists.
   */
  addItemToCategory(
    categoryId: number,
    itemName: string,
    enabled?: boolean
  ): Promise<Result<ItemTemplate, ValidationError>>;

  /**
   * Update item template in category
   *
   * @param itemId - Item template primary key
   * @param updates - Partial item data to update
   * @returns Result with updated item template
   *
   * Note: Changes only affect future checklists, not existing ones.
   */
  updateItemInCategory(
    itemId: number,
    updates: Partial<Pick<ItemTemplate, 'name' | 'enabled'>>
  ): Promise<Result<ItemTemplate, ValidationError>>;

  /**
   * Delete item template from category
   *
   * @param itemId - Item template primary key
   * @returns Result indicating success
   */
  deleteItemFromCategory(itemId: number): Promise<Result<void, Error>>;

  /**
   * Toggle item template enabled state (quick enable/disable in settings)
   *
   * @param itemId - Item template primary key
   * @returns Result with updated item template
   *
   * Note: Changes only affect future checklists, not existing ones.
   */
  toggleItemEnabled(itemId: number): Promise<Result<ItemTemplate, Error>>;

  /**
   * Reorder categories (drag-and-drop in settings)
   *
   * @param categoryIds - Ordered array of category IDs
   * @returns Result indicating success
   *
   * Updates sort_order field for each category to match array index
   */
  reorderCategories(categoryIds: number[]): Promise<Result<void, Error>>;

  /**
   * Reset all categories and item templates to default seed data (FR-011 requirement)
   *
   * @returns Result indicating success
   *
   * Warning: This operation deletes all user-created categories and item templates
   * and restores the original seed data. User should be prompted for confirmation.
   * Existing checklists remain unaffected (they contain immutable snapshots).
   */
  resetToDefaults(): Promise<Result<void, Error>>;

  /**
   * Validate category data before create/update
   *
   * @param category - Category data to validate
   * @returns Array of validation errors (empty if valid)
   *
   * Validation rules:
   * - name: non-empty, max 30 chars, unique
   * - type: must be 'daily' or 'singular'
   * - sort_order: 1-100 range
   */
  validateCategory(category: Partial<Category>): ValidationError[];

  /**
   * Validate item template data before create/update
   *
   * @param itemName - Item name to validate
   * @returns Array of validation errors (empty if valid)
   *
   * Validation rules:
   * - name: non-empty, max 50 chars
   *
   * Note: Template changes only affect future checklists.
   */
  validateItemName(itemName: string): ValidationError[];
}
