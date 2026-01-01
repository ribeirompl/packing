<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="buttonClasses"
    class="touch-target inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'primary',
  disabled: false,
  size: 'md',
});

const buttonClasses = computed(() => {
  const classes: string[] = [];

  // Variant styles
  switch (props.variant) {
    case 'primary':
      classes.push('bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500');
      break;
    case 'secondary':
      classes.push('bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500');
      break;
    case 'danger':
      classes.push('bg-red-600 text-white hover:bg-red-700 focus:ring-red-500');
      break;
    case 'outline':
      classes.push('border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500');
      break;
  }

  // Size styles
  switch (props.size) {
    case 'sm':
      classes.push('text-sm');
      break;
    case 'md':
      classes.push('text-base');
      break;
    case 'lg':
      classes.push('text-lg');
      break;
  }

  return classes.join(' ');
});
</script>
