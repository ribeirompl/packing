import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Checklist, ChecklistItem, Category } from '@/types';

export const useChecklistStore = defineStore('checklist', () => {
  const checklist = ref<Checklist | null>(null);
  const items = ref<ChecklistItem[]>([]);
  const categories = ref<Category[]>([]);

  const hasChecklist = computed(() => checklist.value !== null);
  const totalItems = computed(() => items.value.length);
  const checkedItems = computed(() => items.value.filter((item) => item.checked).length);
  const progress = computed(() => {
    if (totalItems.value === 0) return 0;
    return Math.round((checkedItems.value / totalItems.value) * 100);
  });

  function setChecklist(data: {
    checklist: Checklist;
    items: ChecklistItem[];
    categories: Category[];
  }) {
    checklist.value = data.checklist;
    items.value = data.items;
    categories.value = data.categories;
  }

  function updateItem(itemId: number, checked: boolean) {
    const item = items.value.find((i) => i.id === itemId);
    if (item) {
      item.checked = checked;
    }
  }

  function clearChecklist() {
    checklist.value = null;
    items.value = [];
    categories.value = [];
  }

  return {
    checklist,
    items,
    categories,
    hasChecklist,
    totalItems,
    checkedItems,
    progress,
    setChecklist,
    updateItem,
    clearChecklist,
  };
});
