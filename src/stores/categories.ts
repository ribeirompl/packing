import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Category, ItemTemplate } from '@/types';

export const useCategoryStore = defineStore('categories', () => {
  const categories = ref<Category[]>([]);
  const itemTemplates = ref<ItemTemplate[]>([]);

  function setCategories(data: Category[]) {
    categories.value = data;
  }

  function setItemTemplates(data: ItemTemplate[]) {
    itemTemplates.value = data;
  }

  function addCategory(category: Category) {
    categories.value.push(category);
  }

  function updateCategory(categoryId: number, updates: Partial<Category>) {
    const category = categories.value.find((c) => c.id === categoryId);
    if (category) {
      Object.assign(category, updates);
    }
  }

  function removeCategory(categoryId: number) {
    categories.value = categories.value.filter((c) => c.id !== categoryId);
    itemTemplates.value = itemTemplates.value.filter((i) => i.category_id !== categoryId);
  }

  function addItemTemplate(item: ItemTemplate) {
    itemTemplates.value.push(item);
  }

  function updateItemTemplate(itemId: number, updates: Partial<ItemTemplate>) {
    const item = itemTemplates.value.find((i) => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
    }
  }

  function removeItemTemplate(itemId: number) {
    itemTemplates.value = itemTemplates.value.filter((i) => i.id !== itemId);
  }

  return {
    categories,
    itemTemplates,
    setCategories,
    setItemTemplates,
    addCategory,
    updateCategory,
    removeCategory,
    addItemTemplate,
    updateItemTemplate,
    removeItemTemplate,
  };
});
