import { ref } from 'vue';

interface ToastOptions {
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

const toastMessage = ref('');
const toastVariant = ref<'info' | 'success' | 'warning' | 'error'>('info');
const toastDuration = ref(5000);
const toastKey = ref(0);

export function useToast() {
  function showToast(options: ToastOptions) {
    toastMessage.value = options.message;
    toastVariant.value = options.variant || 'info';
    toastDuration.value = options.duration || 5000;
    toastKey.value++; // Force re-render to trigger animation
  }

  function showSuccess(message: string, duration = 5000) {
    showToast({ message, variant: 'success', duration });
  }

  function showError(message: string, duration = 5000) {
    showToast({ message, variant: 'error', duration });
  }

  function showWarning(message: string, duration = 5000) {
    showToast({ message, variant: 'warning', duration });
  }

  function showInfo(message: string, duration = 5000) {
    showToast({ message, variant: 'info', duration });
  }

  return {
    toastMessage,
    toastVariant,
    toastDuration,
    toastKey,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
