import { CategoryService } from '@/services/CategoryService';
import { useCategoryStore } from '@/stores/categories';
import type { Category, ItemTemplate } from '@/types';

const categoryService = new CategoryService();

export function useCategoryManager() {
  const store = useCategoryStore();

  /**
   * Get all categories
   */
  async function getAllCategories() {
    const result = await categoryService.getAllCategories();

    if (result.success) {
      store.setCategories(result.data);
    }

    return result;
  }

  /**
   * Get category with items
   */
  async function getCategoryWithItems(categoryId: number) {
    return await categoryService.getCategoryWithItems(categoryId);
  }

  /**
   * Create new category
   */
  async function createCategory(category: Omit<Category, 'id'>) {
    const result = await categoryService.createCategory(category);

    if (result.success) {
      store.addCategory(result.data);
    }

    return result;
  }

  /**
   * Update category
   */
  async function updateCategory(categoryId: number, updates: Partial<Omit<Category, 'id'>>) {
    const result = await categoryService.updateCategory(categoryId, updates);

    if (result.success) {
      store.updateCategory(categoryId, updates);
    }

    return result;
  }

  /**
   * Delete category
   */
  async function deleteCategory(categoryId: number) {
    const result = await categoryService.deleteCategory(categoryId);

    if (result.success) {
      store.removeCategory(categoryId);
    }

    return result;
  }

  /**
   * Add item to category
   */
  async function addItemToCategory(
    categoryId: number,
    itemName: string,
    options: Parameters<CategoryService['addItemToCategory']>[2] = {}
  ) {
    const result = await categoryService.addItemToCategory(categoryId, itemName, options);

    if (result.success) {
      store.addItemTemplate(result.data);
    }

    return result;
  }

  /**
   * Update item in category
   */
  async function updateItemInCategory(
    itemId: number,
    updates: Partial<Pick<ItemTemplate, 'name' | 'enabled' | 'tags' | 'quantity' | 'phase'>>
  ) {
    const result = await categoryService.updateItemInCategory(itemId, updates);

    if (result.success) {
      store.updateItemTemplate(itemId, updates);
    }

    return result;
  }

  /**
   * Delete item from category
   */
  async function deleteItemFromCategory(itemId: number) {
    const result = await categoryService.deleteItemFromCategory(itemId);

    if (result.success) {
      store.removeItemTemplate(itemId);
    }

    return result;
  }

  /**
   * Toggle item enabled state
   */
  async function toggleItemEnabled(itemId: number) {
    const result = await categoryService.toggleItemEnabled(itemId);

    if (result.success) {
      store.updateItemTemplate(itemId, { enabled: result.data.enabled });
    }

    return result;
  }

  /**
   * Reorder categories
   */
  async function reorderCategories(categoryIds: number[]) {
    return await categoryService.reorderCategories(categoryIds);
  }

  /**
   * Reset to defaults
   */
  async function resetToDefaults() {
    const result = await categoryService.resetToDefaults();

    if (result.success) {
      await getAllCategories();
    }

    return result;
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
    // Store getters
    categories: store.categories,
    itemTemplates: store.itemTemplates,
  };
}
