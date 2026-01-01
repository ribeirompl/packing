import { CategoryService } from '../services/CategoryService';
import type { Category, ItemTemplate, CategoryWithItems, Result, ValidationError } from '@/types';

const service = new CategoryService();

export function useCategories() {
  /**
   * Get all categories
   */
  async function getAllCategories(): Promise<Result<Category[], Error>> {
    return await service.getAllCategories();
  }

  /**
   * Get a specific category with its items
   */
  async function getCategoryWithItems(
    categoryId: number
  ): Promise<Result<CategoryWithItems, Error>> {
    return await service.getCategoryWithItems(categoryId);
  }

  /**
   * Create a new category
   */
  async function createCategory(
    data: Omit<Category, 'id'>
  ): Promise<Result<Category, ValidationError>> {
    return await service.createCategory(data);
  }

  /**
   * Update a category
   */
  async function updateCategory(
    categoryId: number,
    updates: Partial<Omit<Category, 'id'>>
  ): Promise<Result<Category, ValidationError>> {
    return await service.updateCategory(categoryId, updates);
  }

  /**
   * Delete a category and all its items
   */
  async function deleteCategory(categoryId: number): Promise<Result<void, Error>> {
    return await service.deleteCategory(categoryId);
  }

  /**
   * Add an item to a category
   */
  async function addItemToCategory(
    categoryId: number,
    name: string
  ): Promise<Result<ItemTemplate, ValidationError>> {
    return await service.addItemToCategory(categoryId, name);
  }

  /**
   * Update an item in a category
   */
  async function updateItemInCategory(
    itemId: number,
    updates: Partial<Omit<ItemTemplate, 'id' | 'category_id'>>
  ): Promise<Result<ItemTemplate, ValidationError>> {
    return await service.updateItemInCategory(itemId, updates);
  }

  /**
   * Delete an item from a category
   */
  async function deleteItemFromCategory(itemId: number): Promise<Result<void, Error>> {
    return await service.deleteItemFromCategory(itemId);
  }

  /**
   * Toggle whether an item is enabled
   */
  async function toggleItemEnabled(itemId: number): Promise<Result<ItemTemplate, Error>> {
    return await service.toggleItemEnabled(itemId);
  }

  /**
   * Reorder categories
   */
  async function reorderCategories(categoryIds: number[]): Promise<Result<void, Error>> {
    return await service.reorderCategories(categoryIds);
  }

  /**
   * Reset all categories and items to defaults
   */
  async function resetToDefaults(): Promise<Result<void, Error>> {
    return await service.resetToDefaults();
  }

  return {
    getAllCategories,
    getCategoryWithItems,
    createCategory,
    updateCategory,
    deleteCategory,
    addItemToCategory,
    updateItemInCategory,
    deleteItemFromCategory,
    toggleItemEnabled,
    reorderCategories,
    resetToDefaults,
  };
}
