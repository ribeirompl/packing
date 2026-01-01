import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Preference } from '@/types';

export const usePreferenceStore = defineStore('preferences', () => {
  const preferences = ref<Preference | null>(null);

  function setPreferences(data: Preference) {
    preferences.value = data;
  }

  function updatePreferences(updates: Partial<Preference>) {
    if (preferences.value) {
      Object.assign(preferences.value, updates);
    }
  }

  return {
    preferences,
    setPreferences,
    updatePreferences,
  };
});
