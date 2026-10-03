<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Manage Categories & Items</h2>
      <button
        @click="showAddCategory = true"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
      >
        + Add Category
      </button>
    </div>

    <!-- Add Category Form -->
    <div v-if="showAddCategory" class="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h3 class="text-sm font-medium text-gray-700 mb-3">New Category</h3>
      <form @submit.prevent="handleAddCategory" class="space-y-3">
        <input
          v-model="newCategory.name"
          type="text"
          placeholder="Category name"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
        <div class="flex gap-2">
          <button
            type="submit"
            class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
          >
            Add
          </button>
          <button
            type="button"
            @click="cancelAddCategory"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>

    <!-- Categories List -->
    <div v-if="categories.length > 0" class="space-y-4">
      <CategoryItem
        v-for="category in categories"
        :key="category.id"
        :category="category"
        :items="category.items || []"
        @update="handleUpdateCategory"
        @delete="handleDeleteCategory"
        @add-item="handleAddItem"
        @update-item="handleUpdateItem"
        @delete-item="handleDeleteItem"
        @toggle-item="handleToggleItem"
      />
    </div>

    <div v-else-if="!loading" class="text-center py-8 text-gray-500">
      No categories yet. Add one to get started!
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">Loading categories...</div>

    <!-- Reset to Defaults -->
    <div class="pt-4 border-t border-gray-200">
      <button
        @click="handleResetToDefaults"
        class="w-full py-2 px-4 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium"
      >
        Reset All to Defaults
      </button>
      <p class="mt-2 text-xs text-gray-500 text-center">
        This will restore all default categories and items, removing any customizations
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCategories } from '../../composables/useCategories';
import { db } from '@/db/schema';
import type { Category, ItemTemplate } from '@/types';
import CategoryItem from './CategoryItem.vue';
import { useToast } from '@/composables/useToast';

const {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  addItemToCategory,
  updateItemInCategory,
  deleteItemFromCategory,
  toggleItemEnabled,
  resetToDefaults,
} = useCategories();
const { showError } = useToast();

type CategoryWithItems = Category & { items: ItemTemplate[] };

const categories = ref<CategoryWithItems[]>([]);
const loading = ref(false);
const showAddCategory = ref(false);
const newCategory = ref({
  name: '',
  default_included: true,
  sort_order: 0,
});

onMounted(async () => {
  await loadCategories();
});

async function loadCategories() {
  loading.value = true;
  const result = await getAllCategories();
  if (result.success && result.data) {
    // Fetch items for each category
    const categoriesWithItems = await Promise.all(
      result.data.map(async (category) => {
        const items = await db.item_templates
          .where('category_id')
          .equals(category.id!)
          .sortBy('sort_order');
        return { ...category, items };
      })
    );
    categories.value = categoriesWithItems;
  }
  loading.value = false;
}

async function handleAddCategory() {
  if (!newCategory.value.name.trim()) return;

  const maxSortOrder = categories.value.reduce((max, cat) => Math.max(max, cat.sort_order), 0);
  const categoryData: Omit<Category, 'id'> = {
    name: newCategory.value.name.trim(),
    default_included: true,
    sort_order: maxSortOrder + 1,
  };

  const result = await createCategory(categoryData);
  if (result.success) {
    await loadCategories();
    cancelAddCategory();
  }
}

function cancelAddCategory() {
  showAddCategory.value = false;
  newCategory.value = {
    name: '',
    default_included: true,
    sort_order: 0,
  };
}

async function handleUpdateCategory(categoryId: number, updates: Partial<Omit<Category, 'id'>>) {
  await updateCategory(categoryId, updates);
  await loadCategories();
}

async function handleDeleteCategory(categoryId: number) {
  if (confirm('Are you sure you want to delete this category and all its items?')) {
    await deleteCategory(categoryId);
    await loadCategories();
  }
}

async function handleAddItem(categoryId: number, itemName: string) {
  const result = await addItemToCategory(categoryId, itemName);
  if (!result.success) showError(result.error.message);
  await loadCategories();
}

async function handleUpdateItem(
  itemId: number,
  updates: Partial<Omit<ItemTemplate, 'id' | 'category_id'>>
) {
  const result = await updateItemInCategory(itemId, updates);
  if (!result.success) showError(result.error.message);
  await loadCategories();
}

async function handleDeleteItem(itemId: number) {
  if (confirm('Are you sure you want to delete this item?')) {
    await deleteItemFromCategory(itemId);
    await loadCategories();
  }
}

async function handleToggleItem(itemId: number) {
  await toggleItemEnabled(itemId);
  await loadCategories();
}

async function handleResetToDefaults() {
  if (confirm('This will reset all categories and items to defaults. Are you sure?')) {
    await resetToDefaults();
    await loadCategories();
  }
}
</script>
