import { db } from '@/db/schema';
import { usePreferenceStore } from '@/stores/preferences';
import type { Preference, Result, ValidationError } from '@/types';

export class PreferenceService {
  /**
   * Get current user preferences (singleton, always id: 1)
   */
  async getPreferences(): Promise<Result<Preference, Error>> {
    try {
      let preferences = await db.preferences.get(1);

      if (!preferences) {
        // Create default preferences
        const categories = await db.categories.toArray();
        const defaultPreferences: Omit<Preference, 'id'> = {
          buffer_days_ratio: 7,
          min_buffer_days: 1,
          category_defaults: categories.reduce(
            (acc, cat) => {
              acc[cat.id!] = cat.default_included;
              return acc;
            },
            {} as Record<number, boolean>
          ),
          preferred_categories: categories.map((c) => c.id!),
          welcome_seen: false,
        };

        await db.preferences.put({ ...defaultPreferences, id: 1 });
        preferences = await db.preferences.get(1);
      }

      if (!preferences) {
        return { success: false, error: new Error('Failed to create preferences') };
      }

      const store = usePreferenceStore();
      store.setPreferences(preferences);

      return { success: true, data: preferences };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to load preferences'),
      };
    }
  }

  /**
   * Update user preferences (partial update)
   */
  async updatePreferences(
    updates: Partial<Omit<Preference, 'id'>>
  ): Promise<Result<Preference, ValidationError>> {
    const validationErrors = this.validatePreferences(updates);
    const firstError = validationErrors[0];
    if (firstError) {
      return { success: false, error: firstError };
    }

    try {
      await db.preferences.update(1, updates);
      const preferences = await db.preferences.get(1);

      if (!preferences) {
        return { success: false, error: { field: 'id', message: 'Preferences not found' } };
      }

      const store = usePreferenceStore();
      store.updatePreferences(updates);

      return { success: true, data: preferences };
    } catch (error) {
      return {
        success: false,
        error: {
          field: 'general',
          message: error instanceof Error ? error.message : 'Failed to update preferences',
        },
      };
    }
  }

  /**
   * Update category default included state
   */
  async updateCategoryDefault(
    categoryId: number,
    defaultIncluded: boolean
  ): Promise<Result<Preference, Error>> {
    try {
      const preferences = await db.preferences.get(1);
      if (!preferences) {
        return { success: false, error: new Error('Preferences not found') };
      }

      const updatedDefaults = { ...preferences.category_defaults, [categoryId]: defaultIncluded };
      await db.preferences.update(1, { category_defaults: updatedDefaults });

      const updatedPreferences = await db.preferences.get(1);
      if (!updatedPreferences) {
        return { success: false, error: new Error('Failed to update preferences') };
      }

      const store = usePreferenceStore();
      store.updatePreferences({ category_defaults: updatedDefaults });

      return { success: true, data: updatedPreferences };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update category default'),
      };
    }
  }

  /**
   * Update preferred category order
   */
  async updatePreferredCategories(categoryIds: number[]): Promise<Result<Preference, Error>> {
    try {
      await db.preferences.update(1, { preferred_categories: categoryIds });
      const preferences = await db.preferences.get(1);

      if (!preferences) {
        return { success: false, error: new Error('Preferences not found') };
      }

      const store = usePreferenceStore();
      store.updatePreferences({ preferred_categories: categoryIds });

      return { success: true, data: preferences };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update preferred categories'),
      };
    }
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(): Promise<Result<Preference, Error>> {
    try {
      const categories = await db.categories.toArray();
      const defaultPreferences: Partial<Preference> = {
        buffer_days_ratio: 7,
        min_buffer_days: 1,
        category_defaults: categories.reduce(
          (acc, cat) => {
            acc[cat.id!] = cat.default_included;
            return acc;
          },
          {} as Record<number, boolean>
        ),
        preferred_categories: categories.map((c) => c.id!),
      };

      await db.preferences.update(1, defaultPreferences);
      const preferences = await db.preferences.get(1);

      if (!preferences) {
        return { success: false, error: new Error('Failed to reset preferences') };
      }

      const store = usePreferenceStore();
      store.setPreferences(preferences);

      return { success: true, data: preferences };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to reset preferences'),
      };
    }
  }

  /**
   * Validate preference data
   */
  validatePreferences(preferences: Partial<Preference>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (preferences.buffer_days_ratio !== undefined) {
      if (preferences.buffer_days_ratio < 1) {
        errors.push({
          field: 'buffer_days_ratio',
          message: 'Spare day ratio must be at least 1',
        });
      }
    }

    if (preferences.min_buffer_days !== undefined) {
      if (preferences.min_buffer_days < 0) {
        errors.push({
          field: 'min_buffer_days',
          message: 'Minimum spare days cannot be negative',
        });
      }
    }

    if (preferences.category_defaults !== undefined) {
      if (typeof preferences.category_defaults !== 'object') {
        errors.push({
          field: 'category_defaults',
          message: 'Category defaults must be an object',
        });
      }
    }

    if (preferences.preferred_categories !== undefined) {
      if (!Array.isArray(preferences.preferred_categories)) {
        errors.push({
          field: 'preferred_categories',
          message: 'Preferred categories must be an array',
        });
      }
    }

    return errors;
  }
}
