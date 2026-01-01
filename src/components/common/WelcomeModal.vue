<template>
  <BaseModal :is-open="isOpen" title="Welcome to Packing Checklist!" @close="handleClose">
    <div class="space-y-4">
      <p class="text-gray-600">
        This app helps you create a personalized packing checklist for your trips. Here's how it
        works:
      </p>

      <ol class="list-decimal list-inside space-y-2 text-gray-700">
        <li>Answer a few questions about your trip</li>
        <li>We'll generate a customized packing checklist</li>
        <li>Check off items as you pack</li>
        <li>Your progress is saved automatically</li>
      </ol>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p class="text-sm text-blue-800">
          <strong>💡 Tip:</strong> This app works completely offline. Your data stays on your device
          and never leaves.
        </p>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="primary" @click="handleClose"> Get Started </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BaseModal from './BaseModal.vue';
import BaseButton from './BaseButton.vue';
import { PreferenceService } from '@/services/PreferenceService';

const preferenceService = new PreferenceService();
const isOpen = ref(false);

onMounted(async () => {
  const result = await preferenceService.getPreferences();

  if (result.success && !result.data.welcome_seen) {
    isOpen.value = true;
  }
});

async function handleClose() {
  isOpen.value = false;

  // Mark welcome as seen
  await preferenceService.updatePreferences({ welcome_seen: true });
}
</script>
