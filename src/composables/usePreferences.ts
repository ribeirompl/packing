import { PreferenceService } from '../services/PreferenceService';
import type { Preference, Result, ValidationError } from '@/types';

const service = new PreferenceService();

export function usePreferences() {
  /**
   * Get current preferences
   */
  async function getPreferences(): Promise<Result<Preference, Error>> {
    return await service.getPreferences();
  }

  /**
   * Update preferences
   */
  async function updatePreferences(
    updates: Partial<Preference>
  ): Promise<Result<Preference, ValidationError>> {
    return await service.updatePreferences(updates);
  }

  /**
   * Update whether a category is enabled by default
   */
  async function updateCategoryDefault(
    categoryId: number,
    isEnabled: boolean
  ): Promise<Result<Preference, Error>> {
    return await service.updateCategoryDefault(categoryId, isEnabled);
  }

  /**
   * Update the list of preferred categories
   */
  async function updatePreferredCategories(
    categoryIds: number[]
  ): Promise<Result<Preference, Error>> {
    return await service.updatePreferredCategories(categoryIds);
  }

  /**
   * Reset all preferences to defaults
   */
  async function resetToDefaults(): Promise<Result<Preference, Error>> {
    return await service.resetToDefaults();
  }

  return {
    getPreferences,
    updatePreferences,
    updateCategoryDefault,
    updatePreferredCategories,
    resetToDefaults,
  };
}
