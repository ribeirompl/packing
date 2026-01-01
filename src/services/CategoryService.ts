import { db } from '@/db/schema';
import { useCategoryStore } from '@/stores/categories';
import type { Category, ItemTemplate, CategoryWithItems, Result, ValidationError } from '@/types';

export class CategoryService {
  /**
   * Get all categories (sorted by sort_order ASC)
   */
  async getAllCategories(): Promise<Result<Category[], Error>> {
    try {
      const categories = await db.categories.orderBy('sort_order').toArray();
      const store = useCategoryStore();
      store.setCategories(categories);
      return { success: true, data: categories };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to load categories'),
      };
    }
  }

  /**
   * Get category by ID with item templates
   */
  async getCategoryWithItems(categoryId: number): Promise<Result<CategoryWithItems, Error>> {
    try {
      const category = await db.categories.get(categoryId);
      if (!category) {
        return { success: false, error: new Error('Category not found') };
      }

      const items = await db.item_templates.where('category_id').equals(categoryId).toArray();

      return {
        success: true,
        data: { category, items },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to load category'),
      };
    }
  }

  /**
   * Create new category
   */
  async createCategory(category: Omit<Category, 'id'>): Promise<Result<Category, ValidationError>> {
    const validationErrors = this.validateCategory(category);
    if (validationErrors.length > 0) {
      return { success: false, error: validationErrors[0]! };
    }

    try {
      const id = await db.categories.add(category);
      const newCategory = { ...category, id: id as number };

      const store = useCategoryStore();
      store.addCategory(newCategory);

      return { success: true, data: newCategory };
    } catch (error) {
      return {
        success: false,
        error: {
          field: 'general',
          message: error instanceof Error ? error.message : 'Failed to create category',
        },
      };
    }
  }

  /**
   * Update existing category
   */
  async updateCategory(
    categoryId: number,
    updates: Partial<Omit<Category, 'id'>>
  ): Promise<Result<Category, ValidationError>> {
    const validationErrors = this.validateCategory(updates);
    if (validationErrors.length > 0) {
      return { success: false, error: validationErrors[0]! };
    }

    try {
      await db.categories.update(categoryId, updates);
      const category = await db.categories.get(categoryId);

      if (!category) {
        return { success: false, error: { field: 'id', message: 'Category not found' } };
      }

      const store = useCategoryStore();
      store.updateCategory(categoryId, updates);

      return { success: true, data: category };
    } catch (error) {
      return {
        success: false,
        error: {
          field: 'general',
          message: error instanceof Error ? error.message : 'Failed to update category',
        },
      };
    }
  }

  /**
   * Delete category and all associated item templates (cascade)
   */
  async deleteCategory(categoryId: number): Promise<Result<void, Error>> {
    try {
      // Delete item templates first
      await db.item_templates.where('category_id').equals(categoryId).delete();
      // Delete category
      await db.categories.delete(categoryId);

      const store = useCategoryStore();
      store.removeCategory(categoryId);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete category'),
      };
    }
  }

  /**
   * Add item template to category
   */
  async addItemToCategory(
    categoryId: number,
    itemName: string,
    enabled = true
  ): Promise<Result<ItemTemplate, ValidationError>> {
    const validationErrors = this.validateItemName(itemName);
    if (validationErrors.length > 0) {
      return { success: false, error: validationErrors[0]! };
    }

    try {
      const id = await db.item_templates.add({
        name: itemName,
        category_id: categoryId,
        enabled,
      });
      const item: ItemTemplate = {
        id: id as number,
        name: itemName,
        category_id: categoryId,
        enabled,
      };

      const store = useCategoryStore();
      store.addItemTemplate(item);

      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: {
          field: 'name',
          message: error instanceof Error ? error.message : 'Failed to add item',
        },
      };
    }
  }

  /**
   * Update item template
   */
  async updateItemInCategory(
    itemId: number,
    updates: Partial<Pick<ItemTemplate, 'name' | 'enabled'>>
  ): Promise<Result<ItemTemplate, ValidationError>> {
    if (updates.name) {
      const validationErrors = this.validateItemName(updates.name);
      if (validationErrors.length > 0) {
        return { success: false, error: validationErrors[0]! };
      }
    }

    try {
      await db.item_templates.update(itemId, updates);
      const item = await db.item_templates.get(itemId);

      if (!item) {
        return { success: false, error: { field: 'id', message: 'Item not found' } };
      }

      const store = useCategoryStore();
      store.updateItemTemplate(itemId, updates);

      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: {
          field: 'general',
          message: error instanceof Error ? error.message : 'Failed to update item',
        },
      };
    }
  }

  /**
   * Delete item template
   */
  async deleteItemFromCategory(itemId: number): Promise<Result<void, Error>> {
    try {
      await db.item_templates.delete(itemId);

      const store = useCategoryStore();
      store.removeItemTemplate(itemId);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete item'),
      };
    }
  }

  /**
   * Toggle item template enabled state
   */
  async toggleItemEnabled(itemId: number): Promise<Result<ItemTemplate, Error>> {
    try {
      const item = await db.item_templates.get(itemId);
      if (!item) {
        return { success: false, error: new Error('Item not found') };
      }

      await db.item_templates.update(itemId, { enabled: !item.enabled });
      const updatedItem = await db.item_templates.get(itemId);

      if (!updatedItem) {
        return { success: false, error: new Error('Item not found after update') };
      }

      const store = useCategoryStore();
      store.updateItemTemplate(itemId, { enabled: updatedItem.enabled });

      return { success: true, data: updatedItem };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to toggle item'),
      };
    }
  }

  /**
   * Reorder categories
   */
  async reorderCategories(categoryIds: number[]): Promise<Result<void, Error>> {
    try {
      // Update sort_order for each category
      for (let i = 0; i < categoryIds.length; i++) {
        await db.categories.update(categoryIds[i], { sort_order: i + 1 });
      }

      // Reload categories in store
      await this.getAllCategories();

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to reorder categories'),
      };
    }
  }

  /**
   * Reset to default seed data
   */
  async resetToDefaults(): Promise<Result<void, Error>> {
    try {
      // Delete all custom categories and items
      await db.item_templates.clear();
      await db.categories.clear();

      // Re-seed
      const { seedDefaultData } = await import('@/db/seed');
      await seedDefaultData();

      // Reload store
      await this.getAllCategories();

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to reset to defaults'),
      };
    }
  }

  /**
   * Validate category data
   */
  validateCategory(category: Partial<Category>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (category.name !== undefined) {
      if (!category.name || category.name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Category name is required' });
      } else if (category.name.length > 30) {
        errors.push({ field: 'name', message: 'Category name must be 30 characters or less' });
      }
    }

    if (category.type !== undefined) {
      if (category.type !== 'daily' && category.type !== 'singular') {
        errors.push({ field: 'type', message: 'Category type must be daily or singular' });
      }
    }

    if (category.sort_order !== undefined) {
      if (category.sort_order < 1 || category.sort_order > 100) {
        errors.push({ field: 'sort_order', message: 'Sort order must be between 1 and 100' });
      }
    }

    return errors;
  }

  /**
   * Validate item name
   */
  validateItemName(itemName: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!itemName || itemName.trim().length === 0) {
      errors.push({ field: 'name', message: 'Item name is required' });
    } else if (itemName.length > 50) {
      errors.push({ field: 'name', message: 'Item name must be 50 characters or less' });
    }

    return errors;
  }
}
