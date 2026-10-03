<template>
  <li class="flex items-center gap-1 py-0.5">
    <label class="flex flex-1 min-w-0 min-h-[44px] items-center gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        :checked="item.checked"
        class="w-5 h-5 flex-shrink-0 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        @change="emit('toggle', ($event.target as HTMLInputElement).checked)"
      />
      <span
        class="min-w-0 break-words"
        :class="item.checked ? 'text-gray-400 line-through' : 'text-gray-800'"
      >
        {{ item.name }}
        <span
          v-if="item.quantity > 1"
          class="ml-1 font-semibold"
          :class="item.checked ? 'text-gray-400' : 'text-indigo-600'"
          >×{{ item.quantity }}</span
        >
      </span>
    </label>

    <div class="flex flex-shrink-0 items-center">
      <button
        type="button"
        class="flex h-10 w-9 items-center justify-center rounded-l-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
        :disabled="item.quantity <= 1"
        :aria-label="`Decrease ${item.name}`"
        @click="emit('change-quantity', item.quantity - 1)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-width="2.5" d="M5 12h14" />
        </svg>
      </button>
      <button
        type="button"
        class="-ml-px flex h-10 w-9 items-center justify-center rounded-r-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
        :aria-label="`Increase ${item.name}`"
        @click="emit('change-quantity', item.quantity + 1)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-width="2.5" d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button
        type="button"
        class="ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
        :aria-label="`Remove ${item.name}`"
        @click="emit('delete')"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  </li>
</template>

<script setup lang="ts">
import type { ChecklistItem } from '@/types';

defineProps<{
  item: ChecklistItem;
}>();

const emit = defineEmits<{
  toggle: [checked: boolean];
  'change-quantity': [quantity: number];
  delete: [];
}>();
</script>
