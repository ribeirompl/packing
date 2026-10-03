<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 pb-20">
    <!-- Header -->
    <header class="bg-white shadow-md sticky top-0 z-10">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center gap-4">
          <button
            @click="goBack"
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <svg
              class="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 class="text-2xl font-bold text-gray-800">Settings</h1>
        </div>
      </div>
    </header>

    <!-- Warning Banner -->
    <div class="container mx-auto px-4 mt-4">
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700">
              Settings changes only apply to <strong>new checklists</strong>. Existing checklists
              will not be modified.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="container mx-auto px-4 mt-6">
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <div class="border-b border-gray-200">
          <nav class="flex -mb-px">
            <button
              @click="activeTab = 'preferences'"
              :class="[
                'flex-1 py-4 px-6 text-center font-medium text-sm border-b-2 transition-colors',
                activeTab === 'preferences'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ]"
            >
              Preferences
            </button>
            <button
              @click="activeTab = 'categories'"
              :class="[
                'flex-1 py-4 px-6 text-center font-medium text-sm border-b-2 transition-colors',
                activeTab === 'categories'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ]"
            >
              Categories & Items
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- Preferences Tab -->
          <div v-if="activeTab === 'preferences'" class="space-y-6">
            <PreferenceEditor
              v-if="preferences"
              :preferences="preferences"
              @save="handleSavePreferences"
              @reset="handleResetPreferences"
            />
            <div v-else class="text-center py-8 text-gray-500">Loading preferences...</div>
          </div>

          <!-- Categories & Items Tab -->
          <div v-if="activeTab === 'categories'" class="space-y-6">
            <CategoryManager />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePreferences } from '../composables/usePreferences';
import type { Preference } from '@/types';
import PreferenceEditor from '../components/settings/PreferenceEditor.vue';
import CategoryManager from '../components/settings/CategoryManager.vue';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const { getPreferences, updatePreferences, resetToDefaults } = usePreferences();
const { showError, showSuccess } = useToast();

const activeTab = ref<'preferences' | 'categories'>('preferences');
const preferences = ref<Preference | null>(null);

onMounted(async () => {
  await loadPreferences();
});

async function loadPreferences() {
  const result = await getPreferences();
  if (result.success && result.data) {
    preferences.value = result.data;
  }
}

async function handleSavePreferences(updates: Partial<Preference>) {
  const result = await updatePreferences(updates);
  if (result.success && result.data) {
    preferences.value = result.data;
    showSuccess('Preferences saved', 3000);
  } else if (!result.success) {
    showError(result.error.message);
  }
}

async function handleResetPreferences() {
  const result = await resetToDefaults();
  if (result.success && result.data) {
    preferences.value = result.data;
  }
}

function goBack() {
  router.back();
}
</script>
