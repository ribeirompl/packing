<template>
  <div class="bg-white p-3 rounded-lg border border-gray-200 flex items-center gap-3">
    <!-- Toggle Switch -->
    <button
      @click="$emit('toggle', item.id!)"
      class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500"
      :class="item.enabled ? 'bg-indigo-600' : 'bg-gray-200'"
      role="switch"
      :aria-checked="item.enabled"
    >
      <span
        class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
        :class="item.enabled ? 'translate-x-4' : 'translate-x-0'"
      />
    </button>

    <!-- Item Content -->
    <div v-if="!isEditing" class="flex-1 min-w-0">
      <div class="flex items-baseline gap-2">
        <span class="font-medium text-gray-900 text-sm">{{ item.name }}</span>
        <span v-if="!item.enabled" class="text-xs text-gray-500">(Disabled)</span>
      </div>
    </div>

    <!-- Edit Form -->
    <div v-else class="flex-1 space-y-2">
      <input
        v-model="editData.name"
        type="text"
        class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
        placeholder="Item name"
      />
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-1 flex-shrink-0">
      <template v-if="!isEditing">
        <button
          @click="startEdit"
          class="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Edit item"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
        <button
          @click="$emit('delete', item.id!)"
          class="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete item"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </template>
      <template v-else>
        <button
          @click="saveEdit"
          class="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
          title="Save changes"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </button>
        <button
          @click="cancelEdit"
          class="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Cancel"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ItemTemplate } from '@/types';

const props = defineProps<{
  item: ItemTemplate;
}>();

const emit = defineEmits<{
  update: [itemId: number, updates: Partial<Omit<ItemTemplate, 'id' | 'category_id'>>];
  delete: [itemId: number];
  toggle: [itemId: number];
}>();

const isEditing = ref(false);
const editData = ref({
  name: props.item.name,
});

function startEdit() {
  isEditing.value = true;
  editData.value = {
    name: props.item.name,
  };
}

function saveEdit() {
  if (editData.value.name.trim()) {
    emit('update', props.item.id!, {
      name: editData.value.name.trim(),
    });
  }
  isEditing.value = false;
}

function cancelEdit() {
  isEditing.value = false;
}
</script>
