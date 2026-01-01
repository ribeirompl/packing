<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="show"
      class="fixed bottom-4 right-4 z-50 max-w-md rounded-lg shadow-lg p-4 min-h-[44px] flex items-center gap-3"
      :class="variantClasses"
      role="alert"
    >
      <div class="flex-1 text-sm font-medium">
        {{ message }}
      </div>
      <button
        v-if="dismissible"
        @click="hide"
        class="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Dismiss"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  dismissible?: boolean;
  duration?: number; // Auto-hide after duration (ms), 0 = no auto-hide
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
  dismissible: true,
  duration: 5000,
});

const emit = defineEmits<{
  hide: [];
}>();

const show = ref(false);
let timeoutId: ReturnType<typeof setTimeout> | null = null;

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-green-600 text-white';
    case 'warning':
      return 'bg-yellow-600 text-white';
    case 'error':
      return 'bg-red-600 text-white';
    case 'info':
    default:
      return 'bg-blue-600 text-white';
  }
});

function showToast() {
  show.value = true;

  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  if (props.duration > 0) {
    timeoutId = setTimeout(() => {
      hide();
    }, props.duration);
  }
}

function hide() {
  show.value = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  emit('hide');
}

// Watch for message changes to show toast
watch(
  () => props.message,
  (newMessage) => {
    if (newMessage) {
      showToast();
    }
  },
  { immediate: true }
);

defineExpose({
  show: showToast,
  hide,
});
</script>
