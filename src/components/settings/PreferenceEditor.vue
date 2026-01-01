<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-gray-800">Buffer Days Calculation</h2>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Buffer Days Ratio -->
      <div>
        <label for="buffer-ratio" class="block text-sm font-medium text-gray-700 mb-1">
          Buffer Days Ratio
          <span class="text-gray-500 text-xs ml-1">(days per total days)</span>
        </label>
        <input
          id="buffer-ratio"
          v-model.number="formData.buffer_days_ratio"
          type="number"
          step="0.01"
          min="0"
          max="1"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
        <p class="mt-1 text-xs text-gray-500">
          Example: 0.2 means 1 buffer day for every 5 trip days (20%)
        </p>
      </div>

      <!-- Minimum Buffer Days -->
      <div>
        <label for="min-buffer" class="block text-sm font-medium text-gray-700 mb-1">
          Minimum Buffer Days
        </label>
        <input
          id="min-buffer"
          v-model.number="formData.min_buffer_days"
          type="number"
          min="0"
          max="30"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
        <p class="mt-1 text-xs text-gray-500">
          Ensures you always have at least this many buffer days
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 pt-4">
        <button
          type="submit"
          class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Save Changes
        </button>
        <button
          type="button"
          @click="handleReset"
          class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
        >
          Reset to Defaults
        </button>
      </div>
    </form>

    <!-- Current Values Display -->
    <div class="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 class="text-sm font-medium text-gray-700 mb-2">Current Settings</h3>
      <dl class="space-y-1 text-sm">
        <div class="flex justify-between">
          <dt class="text-gray-600">Buffer Ratio:</dt>
          <dd class="font-medium text-gray-900">{{ preferences.buffer_days_ratio }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-600">Min Buffer Days:</dt>
          <dd class="font-medium text-gray-900">{{ preferences.min_buffer_days }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Preference } from '@/types';

const props = defineProps<{
  preferences: Preference;
}>();

const emit = defineEmits<{
  save: [updates: Partial<Preference>];
  reset: [];
}>();

const formData = ref({
  buffer_days_ratio: props.preferences.buffer_days_ratio,
  min_buffer_days: props.preferences.min_buffer_days,
});

// Update form when props change
watch(
  () => props.preferences,
  (newPrefs) => {
    formData.value = {
      buffer_days_ratio: newPrefs.buffer_days_ratio,
      min_buffer_days: newPrefs.min_buffer_days,
    };
  }
);

function handleSubmit() {
  emit('save', {
    buffer_days_ratio: formData.value.buffer_days_ratio,
    min_buffer_days: formData.value.min_buffer_days,
  });
}

function handleReset() {
  emit('reset');
}
</script>
