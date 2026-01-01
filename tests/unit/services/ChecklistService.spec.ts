import { describe, it, expect, beforeEach } from 'vitest';
import { ChecklistService } from '../../../src/services/ChecklistService';
import { db } from '../../../src/db/schema';
import type { QuestionnaireInput } from '../../../src/types';

describe('ChecklistService', () => {
  const service = new ChecklistService();

  beforeEach(async () => {
    // Clear database before each test
    await db.delete();
    await db.open();

    // Seed test data
    const category1 = await db.categories.add({
      name: 'Clothes',
      type: 'general',
      sort_order: 1,
      default_included: true,
    });

    const category2 = await db.categories.add({
      name: 'Electronics',
      type: 'general',
      sort_order: 2,
      default_included: true,
    });

    await db.item_templates.bulkAdd([
      { name: 'T-shirt', category_id: category1, enabled: true },
      { name: 'Shorts', category_id: category1, enabled: true, hot_weather: true },
      { name: 'Formal Shirt', category_id: category1, enabled: true, formal_attire: true },
      { name: 'Swimsuit', category_id: category1, enabled: true, swimming: true },
      { name: 'Laptop', category_id: category2, enabled: true },
      { name: 'Charger', category_id: category2, enabled: false },
    ]);
  });

  describe('generateChecklist', () => {
    it('should create checklist with snapshot items', async () => {
      const input: QuestionnaireInput = {
        start_date: '2024-06-01',
        end_date: '2024-06-05',
        buffer_days: 2,
        formal_attire: false,
        swimming: false,
        hot_weather: false,
        washing_machine_available: false,
        max_days_before_washing: undefined,
        selected_categories: [1, 2],
      };

      const result = await service.generateChecklist(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.checklist.title).toBe('2024-06-01 to 2024-06-05');
        expect(result.data.checklist.start_date).toBe('2024-06-01');
        expect(result.data.checklist.end_date).toBe('2024-06-05');
        expect(result.data.checklist.buffer_days).toBe(2);
        expect(result.data.items.length).toBeGreaterThan(0);
      }
    });

    it('should filter items by conditions (formal_attire)', async () => {
      const inputNoFormal: QuestionnaireInput = {
        start_date: '2024-06-01',
        end_date: '2024-06-05',
        buffer_days: 1,
        formal_attire: false,
        swimming: false,
        hot_weather: false,
        washing_machine_available: false,
        max_days_before_washing: undefined,
        selected_categories: [1],
      };

      const resultNoFormal = await service.generateChecklist(inputNoFormal);
      expect(resultNoFormal.success).toBe(true);
      if (resultNoFormal.success) {
        const formalItems = resultNoFormal.data.items.filter((item) =>
          item.name.includes('Formal')
        );
        expect(formalItems.length).toBe(0);
      }

      await service.clearCurrentChecklist();

      const inputWithFormal: QuestionnaireInput = {
        ...inputNoFormal,
        formal_attire: true,
      };

      const resultWithFormal = await service.generateChecklist(inputWithFormal);
      expect(resultWithFormal.success).toBe(true);
      if (resultWithFormal.success) {
        const formalItems = resultWithFormal.data.items.filter((item) =>
          item.name.includes('Formal')
        );
        expect(formalItems.length).toBeGreaterThan(0);
      }
    });

    it('should only include enabled item templates', async () => {
      const input: QuestionnaireInput = {
        start_date: '2024-06-01',
        end_date: '2024-06-05',
        buffer_days: 1,
        formal_attire: false,
        swimming: false,
        hot_weather: false,
        washing_machine_available: false,
        max_days_before_washing: undefined,
        selected_categories: [2],
      };

      const result = await service.generateChecklist(input);
      expect(result.success).toBe(true);
      if (result.success) {
        // Charger is disabled, so shouldn't appear
        const chargerItems = result.data.items.filter((item) => item.name === 'Charger');
        expect(chargerItems.length).toBe(0);

        // Laptop is enabled, so should appear
        const laptopItems = result.data.items.filter((item) => item.name === 'Laptop');
        expect(laptopItems.length).toBeGreaterThan(0);
      }
    });

    it('should validate required fields', async () => {
      const invalidInput = {
        start_date: '',
        end_date: '2024-06-05',
        buffer_days: 1,
        selected_categories: [1],
      } as QuestionnaireInput;

      const result = await service.generateChecklist(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe('start_date');
      }
    });

    it('should replace existing checklist (singleton pattern)', async () => {
      const input1: QuestionnaireInput = {
        start_date: '2024-06-01',
        end_date: '2024-06-05',
        buffer_days: 1,
        formal_attire: false,
        swimming: false,
        hot_weather: false,
        washing_machine_available: false,
        max_days_before_washing: undefined,
        selected_categories: [1],
      };

      const result1 = await service.generateChecklist(input1);
      expect(result1.success).toBe(true);

      const input2: QuestionnaireInput = {
        start_date: '2024-07-01',
        end_date: '2024-07-10',
        buffer_days: 2,
        formal_attire: true,
        swimming: true,
        hot_weather: true,
        washing_machine_available: false,
        max_days_before_washing: undefined,
        selected_categories: [1, 2],
      };

      const result2 = await service.generateChecklist(input2);
      expect(result2.success).toBe(true);

      // Verify only one checklist exists
      const allChecklists = await db.checklists.toArray();
      expect(allChecklists.length).toBe(1);
      if (result2.success) {
        expect(allChecklists[0].title).toBe('2024-07-01 to 2024-07-10');
      }
    });
  });

  describe('updateItemChecked', () => {
    it('should persist checked state to IndexedDB', async () => {
      const input: QuestionnaireInput = {
        start_date: '2024-06-01',
        end_date: '2024-06-05',
        buffer_days: 1,
        formal_attire: false,
        swimming: false,
        hot_weather: false,
        washing_machine_available: false,
        max_days_before_washing: undefined,
        selected_categories: [1],
      };

      const generateResult = await service.generateChecklist(input);
      expect(generateResult.success).toBe(true);

      if (generateResult.success) {
        const firstItem = generateResult.data.items[0];
        expect(firstItem.checked).toBe(false);

        // Update checked state
        await service.updateItemChecked(firstItem.id!, true);

        // Fetch from DB to verify persistence
        const updatedItem = await db.checklist_items.get(firstItem.id!);
        expect(updatedItem?.checked).toBe(true);

        // Uncheck
        await service.updateItemChecked(firstItem.id!, false);
        const uncheckedItem = await db.checklist_items.get(firstItem.id!);
        expect(uncheckedItem?.checked).toBe(false);
      }
    });
  });

  describe('getCurrentChecklist', () => {
    it('should return null when no checklist exists', async () => {
      const result = await service.getCurrentChecklist();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should return checklist with items and categories', async () => {
      const input: QuestionnaireInput = {
        start_date: '2024-06-01',
        end_date: '2024-06-05',
        buffer_days: 1,
        formal_attire: false,
        swimming: false,
        hot_weather: false,
        washing_machine_available: false,
        max_days_before_washing: undefined,
        selected_categories: [1, 2],
      };

      await service.generateChecklist(input);

      const result = await service.getCurrentChecklist();
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.checklist).toBeDefined();
        expect(result.data.items.length).toBeGreaterThan(0);
        expect(result.data.categories.length).toBe(2);
      }
    });
  });

  describe('clearCurrentChecklist', () => {
    it('should delete checklist and all items', async () => {
      const input: QuestionnaireInput = {
        start_date: '2024-06-01',
        end_date: '2024-06-05',
        buffer_days: 1,
        formal_attire: false,
        swimming: false,
        hot_weather: false,
        washing_machine_available: false,
        max_days_before_washing: undefined,
        selected_categories: [1],
      };

      await service.generateChecklist(input);

      const before = await db.checklists.toArray();
      expect(before.length).toBe(1);

      await service.clearCurrentChecklist();

      const afterChecklists = await db.checklists.toArray();
      const afterItems = await db.checklist_items.toArray();
      expect(afterChecklists.length).toBe(0);
      expect(afterItems.length).toBe(0);
    });
  });

  describe('getCategorySummary', () => {
    it('should return category progress statistics', async () => {
      const input: QuestionnaireInput = {
        start_date: '2024-06-01',
        end_date: '2024-06-05',
        buffer_days: 1,
        formal_attire: false,
        swimming: false,
        hot_weather: false,
        washing_machine_available: false,
        max_days_before_washing: undefined,
        selected_categories: [1, 2],
      };

      const generateResult = await service.generateChecklist(input);
      expect(generateResult.success).toBe(true);

      if (generateResult.success) {
        // Check one item
        await service.updateItemChecked(generateResult.data.items[0].id!, true);

        const summary = await service.getCategorySummary();
        expect(summary.length).toBeGreaterThan(0);
        expect(summary[0]).toHaveProperty('category_name');
        expect(summary[0]).toHaveProperty('total_items');
        expect(summary[0]).toHaveProperty('checked_items');
        expect(summary[0]).toHaveProperty('percentage');
      }
    });
  });

  describe('updateCategoryChecked', () => {
    it('should toggle all items in a category at once', async () => {
      const input: QuestionnaireInput = {
        start_date: '2024-06-01',
        end_date: '2024-06-05',
        buffer_days: 1,
        formal_attire: false,
        swimming: false,
        hot_weather: false,
        washing_machine_available: false,
        max_days_before_washing: undefined,
        selected_categories: [1, 2],
      };

      const generateResult = await service.generateChecklist(input);
      expect(generateResult.success).toBe(true);

      if (generateResult.success) {
        const category1Items = generateResult.data.items.filter(
          (item: any) => item.category_id === 1
        );
        expect(category1Items.length).toBeGreaterThan(0);

        // Check all items in category 1
        await service.updateCategoryChecked(1, true);

        // Verify all items in category 1 are checked
        const checkedItems = await db.checklist_items
          .where({ checklist_id: generateResult.data.checklist.id!, category_id: 1 })
          .toArray();

        expect(checkedItems.every((item) => item.checked)).toBe(true);

        // Uncheck all items in category 1
        await service.updateCategoryChecked(1, false);

        const uncheckedItems = await db.checklist_items
          .where({ checklist_id: generateResult.data.checklist.id!, category_id: 1 })
          .toArray();

        expect(uncheckedItems.every((item) => !item.checked)).toBe(true);
      }
    });

    it('should update category summary after bulk toggle', async () => {
      const input: QuestionnaireInput = {
        start_date: '2024-06-01',
        end_date: '2024-06-05',
        buffer_days: 1,
        formal_attire: false,
        swimming: false,
        hot_weather: false,
        washing_machine_available: false,
        max_days_before_washing: undefined,
        selected_categories: [1],
      };

      await service.generateChecklist(input);

      // Check all items in category 1
      await service.updateCategoryChecked(1, true);

      const summary = await service.getCategorySummary();
      const category1Summary = summary.find((s: any) => s.category_id === 1);

      expect(category1Summary).toBeDefined();
      if (category1Summary) {
        expect(category1Summary.checked_items).toBe(category1Summary.total_items);
        expect(category1Summary.percentage).toBe(100);
      }
    });
  });
});
