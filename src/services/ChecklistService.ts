import { db } from '@/db/schema';
import { useChecklistStore } from '@/stores/checklist';
import { usePerDayCalculator } from '@/composables/usePerDayCalculator';
import { format, parseISO } from 'date-fns';
import type {
  Checklist,
  ChecklistItem,
  QuestionnaireInput,
  ChecklistWithItems,
  DayBreakdown,
  CategorySummary,
  Result,
  ValidationError,
} from '@/types';

export class ChecklistService {
  /**
   * Generate a new checklist from questionnaire input (replaces existing)
   */
  async generateChecklist(
    input: QuestionnaireInput
  ): Promise<Result<ChecklistWithItems, ValidationError>> {
    const validationErrors = this.validateQuestionnaireInput(input);
    if (validationErrors.length > 0) {
      return { success: false, error: validationErrors[0]! };
    }

    try {
      const calculator = usePerDayCalculator();
      const tripDays = calculator.calculateTripDuration(input.start_date, input.end_date);

      // Delete existing checklist (singleton pattern)
      await this.clearCurrentChecklist();

      // Load selected categories and enabled item templates
      const categories = await db.categories.where('id').anyOf(input.selected_categories).toArray();
      const itemTemplates = await db.item_templates
        .where('category_id')
        .anyOf(input.selected_categories)
        .filter((tmpl) => tmpl.enabled)
        .toArray();

      // Create checklist
      const checklist: Omit<Checklist, 'id'> = {
        title: `${format(parseISO(input.start_date), 'MMM d')} - ${format(parseISO(input.end_date), 'MMM d, yyyy')}`,
        start_date: input.start_date,
        end_date: input.end_date,
        buffer_days: input.buffer_days,
        formal_attire: input.formal_attire,
        swimming: input.swimming,
        hot_weather: input.hot_weather,
        washing_machine_available: input.washing_machine_available,
        max_days_before_washing: input.max_days_before_washing,
        created_at: new Date().toISOString(),
      };

      const checklistId = await db.checklists.add(checklist);

      // Generate checklist item instances
      const checklistItems: Omit<ChecklistItem, 'id'>[] = [];
      const totalDays = tripDays + input.buffer_days;

      for (const template of itemTemplates) {
        const category = categories.find((c) => c.id === template.category_id);
        if (!category) continue;

        // Apply conditional rules for all items
        if (template.name.toLowerCase().includes('formal') && !input.formal_attire) continue;
        if (template.name.toLowerCase().includes('swim') && !input.swimming) continue;
        if (template.name.toLowerCase().includes('short') && !input.hot_weather) continue;
        if (template.name.toLowerCase().includes('sunscreen') && !input.hot_weather) continue;

        if (category.type === 'daily') {
          // Create one item per day for daily items
          const itemsPerDay = calculator.calculateDailyQuantity(
            tripDays,
            input.buffer_days,
            input.washing_machine_available,
            input.max_days_before_washing
          );

          // Spread items across days (distribute evenly if washing machine available)
          const daysToUse =
            input.washing_machine_available && input.max_days_before_washing
              ? Math.min(input.max_days_before_washing, totalDays)
              : totalDays;

          for (let day = 1; day <= daysToUse; day++) {
            checklistItems.push({
              checklist_id: checklistId as number,
              name: template.name,
              category_name: category.name,
              category_id: template.category_id,
              quantity: Math.ceil(itemsPerDay / daysToUse),
              day: day,
              checked: false,
            });
          }
        } else {
          // Singular items - create one item without a day
          checklistItems.push({
            checklist_id: checklistId as number,
            name: template.name,
            category_name: category.name,
            category_id: template.category_id,
            quantity: 1,
            checked: false,
          });
        }
      }

      await db.checklist_items.bulkAdd(checklistItems);

      // Update store
      const store = useChecklistStore();
      const items = await db.checklist_items
        .where('checklist_id')
        .equals(checklistId as number)
        .toArray();
      store.setChecklist({
        checklist: { ...checklist, id: checklistId as number },
        items,
        categories,
      });

      return {
        success: true,
        data: {
          checklist: { ...checklist, id: checklistId as number },
          items,
          categories,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          field: 'general',
          message: error instanceof Error ? error.message : 'Failed to generate checklist',
        },
      };
    }
  }

  /**
   * Get the current active checklist (singleton)
   */
  async getCurrentChecklist(): Promise<Result<ChecklistWithItems | null, Error>> {
    try {
      const checklist = await db.checklists.toCollection().first();
      if (!checklist) {
        return { success: true, data: null };
      }

      const items = await db.checklist_items.where('checklist_id').equals(checklist.id!).toArray();
      const categoryIds = [...new Set(items.map((i) => i.category_id))];
      const categories = await db.categories.where('id').anyOf(categoryIds).toArray();

      const data: ChecklistWithItems = { checklist, items, categories };

      // Update store
      const store = useChecklistStore();
      store.setChecklist(data);

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to load checklist'),
      };
    }
  }

  /**
   * Update item checked state
   */
  async updateItemChecked(itemId: number, checked: boolean): Promise<Result<ChecklistItem, Error>> {
    try {
      await db.checklist_items.update(itemId, { checked });
      const item = await db.checklist_items.get(itemId);

      if (!item) {
        return { success: false, error: new Error('Item not found') };
      }

      // Update store
      const store = useChecklistStore();
      store.updateItem(itemId, checked);

      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update item'),
      };
    }
  }

  /**
   * Update checked state for all items in a category (bulk toggle)
   */
  async updateCategoryChecked(categoryId: number, checked: boolean): Promise<Result<void, Error>> {
    try {
      const checklist = await db.checklists.toCollection().first();
      if (!checklist) {
        return { success: false, error: new Error('No active checklist') };
      }

      const items = await db.checklist_items
        .where({ checklist_id: checklist.id!, category_id: categoryId })
        .toArray();

      await db.transaction('rw', db.checklist_items, async () => {
        for (const item of items) {
          if (item.checked !== checked) {
            await db.checklist_items.update(item.id!, { checked });
          }
        }
      });

      // Refresh store with updated items
      const store = useChecklistStore();
      const allItems = await db.checklist_items
        .where('checklist_id')
        .equals(checklist.id!)
        .toArray();
      const categoryIds = [...new Set(allItems.map((i) => i.category_id))];
      const categories = await db.categories.where('id').anyOf(categoryIds).toArray();

      store.setChecklist({ checklist, items: allItems, categories });

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error('Failed to update category checked state'),
      };
    }
  }

  /**
   * Clear/delete the current checklist and all its items
   */
  async clearCurrentChecklist(): Promise<Result<void, Error>> {
    try {
      const checklist = await db.checklists.toCollection().first();
      if (checklist) {
        await db.checklist_items.where('checklist_id').equals(checklist.id!).delete();
        await db.checklists.delete(checklist.id!);
      }

      // Update store
      const store = useChecklistStore();
      store.clearChecklist();

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to clear checklist'),
      };
    }
  }

  /**
   * Get per-day breakdown of items
   */
  async getDayBreakdown(): Promise<Result<DayBreakdown[], Error>> {
    try {
      const checklist = await db.checklists.toCollection().first();
      if (!checklist) {
        return { success: true, data: [] };
      }

      const calculator = usePerDayCalculator();
      const tripDays = calculator.calculateTripDuration(checklist.start_date, checklist.end_date);
      const items = await db.checklist_items.where('checklist_id').equals(checklist.id!).toArray();

      const breakdown: DayBreakdown[] = [];
      for (let day = 1; day <= tripDays; day++) {
        const dayDate = calculator.getDayDate(checklist.start_date, day);
        const dayItems = items.filter((item) => item.day === day);

        if (dayItems.length === 0) continue;

        const categoryGroups = new Map<number, { category_name: string; items: ChecklistItem[] }>();

        dayItems.forEach((item) => {
          if (!categoryGroups.has(item.category_id)) {
            categoryGroups.set(item.category_id, {
              category_name: item.category_name,
              items: [],
            });
          }
          categoryGroups.get(item.category_id)!.items.push(item);
        });

        breakdown.push({
          day,
          date: dayDate,
          dayLabel: day <= tripDays ? `Day ${day}` : `Buffer Day ${day - tripDays}`,
          items: dayItems,
          categories: Array.from(categoryGroups.entries()).map(([category_id, group]) => ({
            category_id,
            category_name: group.category_name,
            items: group.items,
          })),
        });
      }

      return { success: true, data: breakdown };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get day breakdown'),
      };
    }
  }

  /**
   * Get category summary for current checklist
   */
  async getCategorySummary(): Promise<Result<CategorySummary[], Error>> {
    try {
      const checklist = await db.checklists.toCollection().first();
      if (!checklist) {
        return { success: true, data: [] };
      }

      const items = await db.checklist_items.where('checklist_id').equals(checklist.id!).toArray();
      const categoryIds = [...new Set(items.map((i) => i.category_id))];
      const categories = await db.categories.where('id').anyOf(categoryIds).toArray();

      const summary: CategorySummary[] = categories.map((category) => {
        const categoryItems = items.filter((i) => i.category_id === category.id);
        const checkedItems = categoryItems.filter((i) => i.checked).length;
        const totalItems = categoryItems.length;
        const percentage = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

        return {
          category_id: category.id!,
          category_name: category.name,
          icon: category.icon,
          total_items: totalItems,
          checked_items: checkedItems,
          percentage,
        };
      });

      return { success: true, data: summary };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get category summary'),
      };
    }
  }

  /**
   * Validate questionnaire input
   */
  validateQuestionnaireInput(input: QuestionnaireInput): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!input.start_date) {
      errors.push({ field: 'start_date', message: 'Start date is required' });
    }

    if (!input.end_date) {
      errors.push({ field: 'end_date', message: 'End date is required' });
    }

    if (input.start_date && input.end_date && input.start_date > input.end_date) {
      errors.push({ field: 'end_date', message: 'End date must be after start date' });
    }

    if (input.buffer_days < 0) {
      errors.push({ field: 'buffer_days', message: 'Buffer days cannot be negative' });
    }

    if (input.washing_machine_available && input.max_days_before_washing) {
      if (input.max_days_before_washing < 1 || input.max_days_before_washing > 14) {
        errors.push({
          field: 'max_days_before_washing',
          message: 'Max days before washing must be between 1 and 14',
        });
      }
    }

    if (!input.selected_categories || input.selected_categories.length === 0) {
      errors.push({
        field: 'selected_categories',
        message: 'Please select at least one category',
      });
    }

    return errors;
  }
}
