<template>
  <button
    type="button"
    :role="role"
    :aria-pressed="role === 'button' ? selected : undefined"
    :aria-checked="role === 'radio' ? selected : undefined"
    :class="[
      'inline-flex items-center justify-center gap-1.5 rounded-full border font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
      size === 'sm' ? 'min-h-[32px] px-3 text-xs' : 'min-h-[44px] px-4 text-sm',
      selected
        ? 'border-blue-600 bg-blue-600 text-white'
        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50',
    ]"
    @click="emit('toggle')"
  >
    <svg
      v-if="selected && role === 'button'"
      class="w-3.5 h-3.5 -ml-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
    </svg>
    <slot />
  </button>
</template>

<script setup lang="ts">
/**
 * A pill-shaped toggle button, used for multi-select chips (role "button", shows a check
 * when selected) or as an option of a single-select group (role "radio").
 */
withDefaults(
  defineProps<{
    selected: boolean;
    size?: 'sm' | 'md';
    role?: 'button' | 'radio';
  }>(),
  { size: 'md', role: 'button' }
);

const emit = defineEmits<{
  toggle: [];
}>();
</script>
