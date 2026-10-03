<template>
  <div>
    <button
      v-if="!open"
      type="button"
      class="min-h-[44px] w-full rounded-lg text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-2"
      @click="openForm"
    >
      + Add item
    </button>
    <form v-else class="space-y-1" @submit.prevent="submit" @keydown.esc="close">
      <div class="flex items-center gap-2">
        <input
          ref="nameInput"
          v-model="name"
          type="text"
          placeholder="Item name"
          aria-label="New item name"
          class="min-h-[44px] min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          v-model.number="quantity"
          type="number"
          min="1"
          step="1"
          aria-label="Quantity"
          class="min-h-[44px] w-16 rounded-lg border border-gray-300 px-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          class="min-h-[44px] rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          :disabled="saving"
        >
          Add
        </button>
        <button
          type="button"
          class="flex h-11 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Cancel adding item"
          @click="close"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { useChecklist } from '@/composables/useChecklist';
import type { PackPhase } from '@/types';

const props = withDefaults(
  defineProps<{
    categoryId: number;
    phase?: PackPhase;
  }>(),
  { phase: 'ahead' }
);

const { addCustomItem } = useChecklist();

const open = ref(false);
const name = ref('');
const quantity = ref<number | ''>(1);
const error = ref('');
const saving = ref(false);
const nameInput = ref<HTMLInputElement | null>(null);

async function openForm() {
  open.value = true;
  await nextTick();
  nameInput.value?.focus();
}

function close() {
  open.value = false;
  name.value = '';
  quantity.value = 1;
  error.value = '';
}

async function submit() {
  error.value = '';
  if (!name.value.trim()) {
    error.value = 'Enter a name';
    return;
  }
  const qty = quantity.value === '' ? 1 : quantity.value;
  if (!Number.isInteger(qty) || qty < 1) {
    error.value = 'Quantity must be a whole number of at least 1';
    return;
  }

  saving.value = true;
  const result = await addCustomItem({
    name: name.value,
    category_id: props.categoryId,
    quantity: qty,
    phase: props.phase,
  });
  saving.value = false;

  if (result.success) {
    // Stay open so several items can be added in a row
    name.value = '';
    quantity.value = 1;
    nameInput.value?.focus();
  } else {
    error.value = result.error.message;
  }
}
</script>
