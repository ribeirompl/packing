<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <WelcomeModal />
    <RouterView />
    <Toast
      :key="toastKey"
      :message="toastMessage"
      :variant="toastVariant"
      :duration="toastDuration"
    />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import WelcomeModal from '@/components/common/WelcomeModal.vue';
import Toast from '@/components/common/Toast.vue';
import { useToast } from '@/composables/useToast';

const { toastMessage, toastVariant, toastDuration, toastKey } = useToast();
</script>
