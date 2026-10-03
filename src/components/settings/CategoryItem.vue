<template>
  <div class="border border-gray-200 rounded-lg overflow-hidden">
    <!-- Category Header -->
    <div class="bg-white p-4 flex items-center gap-3">
      <!-- Category Name -->
      <div class="flex-1">
        <input
          v-if="isEditing"
          v-model="editName"
          type="text"
          class="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          @blur="saveEdit"
          @keyup.enter="saveEdit"
          @keyup.escape="cancelEdit"
        />
        <h3 v-else class="font-medium text-gray-900">
          {{ category.name }}
          <span class="text-xs font-normal text-gray-500 ml-1">({{ items.length }})</span>
        </h3>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2">
        <button
          v-if="!isEditing"
          @click="startEdit"
          class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Edit category name"
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
          @click="$emit('delete', category.id!)"
          class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete category"
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
        <button
          @click="toggleExpanded"
          class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          :title="expanded ? 'Collapse items' : 'Expand items'"
        >
          <svg
            class="w-4 h-4 transition-transform"
            :class="{ 'rotate-180': expanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Items List -->
    <div v-if="expanded" class="bg-gray-50 border-t border-gray-200">
      <div class="p-4 space-y-3">
        <!-- Add Item Form -->
        <div v-if="showAddItem" class="bg-white p-3 rounded-lg border border-gray-200">
          <form @submit.prevent="handleAddItem" class="space-y-2">
            <input
              v-model="newItemName"
              type="text"
              placeholder="Item name"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              required
            />
            <div class="flex gap-2">
              <button
                type="submit"
                class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                Add Item
              </button>
              <button
                type="button"
                @click="cancelAddItem"
                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <button
          v-else
          @click="showAddItem = true"
          class="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors text-sm font-medium"
        >
          + Add Item
        </button>

        <!-- Items -->
        <div v-if="items.length > 0" class="space-y-2">
          <ItemTemplateItem
            v-for="item in items"
            :key="item.id"
            :item="item"
            @update="handleUpdateItem"
            @delete="$emit('delete-item', item.id!)"
            @toggle="$emit('toggle-item', item.id!)"
          />
        </div>
        <div v-else class="text-center py-4 text-gray-500 text-sm">
          No items in this category yet
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Category, ItemTemplate } from '@/types';
import ItemTemplateItem from './ItemTemplateItem.vue';

const props = defineProps<{
  category: Category;
  items: ItemTemplate[];
}>();

const emit = defineEmits<{
  update: [categoryId: number, updates: Partial<Omit<Category, 'id'>>];
  delete: [categoryId: number];
  'add-item': [categoryId: number, itemName: string];
  'update-item': [itemId: number, updates: Partial<Omit<ItemTemplate, 'id' | 'category_id'>>];
  'delete-item': [itemId: number];
  'toggle-item': [itemId: number];
}>();

const expanded = ref(false);
const isEditing = ref(false);
const editName = ref(props.category.name);
const showAddItem = ref(false);
const newItemName = ref('');

function toggleExpanded() {
  expanded.value = !expanded.value;
}

function startEdit() {
  isEditing.value = true;
  editName.value = props.category.name;
}

function saveEdit() {
  if (editName.value.trim() && editName.value !== props.category.name) {
    emit('update', props.category.id!, { name: editName.value.trim() });
  }
  isEditing.value = false;
}

function cancelEdit() {
  isEditing.value = false;
  editName.value = props.category.name;
}

function handleAddItem() {
  if (!newItemName.value.trim()) return;

  emit('add-item', props.category.id!, newItemName.value.trim());

  cancelAddItem();
}

function cancelAddItem() {
  showAddItem.value = false;
  newItemName.value = '';
}

function handleUpdateItem(
  itemId: number,
  updates: Partial<Omit<ItemTemplate, 'id' | 'category_id'>>
) {
  emit('update-item', itemId, updates);
}
</script>
