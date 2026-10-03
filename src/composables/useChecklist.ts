import { ChecklistService } from '@/services/ChecklistService';
import { useChecklistStore } from '@/stores/checklist';
import type { QuestionnaireInput, CategorySummary, ChecklistSnapshot, PackPhase } from '@/types';

const checklistService = new ChecklistService();

export function useChecklist() {
  const store = useChecklistStore();

  /**
   * Generate a new checklist from questionnaire input
   */
  async function generateChecklist(input: QuestionnaireInput) {
    const result = await checklistService.generateChecklist(input);

    if (result.success) {
      store.setChecklist(result.data);
    }

    return result;
  }

  /**
   * Get the current active checklist
   */
  async function getCurrentChecklist() {
    return await checklistService.getCurrentChecklist();
  }

  /**
   * Update item checked state
   */
  async function updateItemChecked(itemId: number, checked: boolean) {
    const result = await checklistService.updateItemChecked(itemId, checked);

    if (result.success) {
      store.updateItem(itemId, checked);
    }

    return result;
  }

  /**
   * Update all items in a category (bulk toggle)
   */
  async function updateCategoryChecked(categoryId: number, checked: boolean) {
    return await checklistService.updateCategoryChecked(categoryId, checked);
  }

  /**
   * Clear the current checklist
   */
  async function clearCurrentChecklist() {
    const result = await checklistService.clearCurrentChecklist();

    if (result.success) {
      store.clearChecklist();
    }

    return result;
  }

  async function updateItemQuantity(itemId: number, quantity: number) {
    return await checklistService.updateItemQuantity(itemId, quantity);
  }

  async function addCustomItem(item: {
    name: string;
    category_id: number;
    quantity?: number;
    phase?: PackPhase;
  }) {
    return await checklistService.addCustomItem(item);
  }

  async function deleteItem(itemId: number) {
    return await checklistService.deleteItem(itemId);
  }

  async function getSnapshot(includeChecked: boolean) {
    return await checklistService.getSnapshot(includeChecked);
  }

  async function importChecklist(
    snapshot: ChecklistSnapshot,
    options?: { addToLibrary?: boolean }
  ) {
    return await checklistService.importChecklist(snapshot, options);
  }

  /**
   * Get category summary
   */
  async function getCategorySummary(): Promise<CategorySummary[]> {
    const result = await checklistService.getCategorySummary();
    return result.success ? result.data : [];
  }

  return {
    generateChecklist,
    getCurrentChecklist,
    updateItemChecked,
    updateCategoryChecked,
    clearCurrentChecklist,
    updateItemQuantity,
    addCustomItem,
    deleteItem,
    getSnapshot,
    importChecklist,
    getCategorySummary,
    // Store getters
    checklist: store.checklist,
    items: store.items,
    categories: store.categories,
    hasChecklist: store.hasChecklist,
    totalItems: store.totalItems,
    checkedItems: store.checkedItems,
    progress: store.progress,
  };
}
