import { db } from '@/db/schema';
import { useChecklistStore } from '@/stores/checklist';
import { usePerDayCalculator } from '@/composables/usePerDayCalculator';
import { format, parseISO } from 'date-fns';
import type {
  Category,
  Checklist,
  ChecklistItem,
  ChecklistSnapshot,
  QuestionnaireInput,
  ChecklistWithItems,
  CategorySummary,
  ItemTemplate,
  PackPhase,
  Result,
  TripTag,
  ValidationError,
} from '@/types';

function toError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

function checklistTitle(startDate: string, endDate: string): string {
  return `${format(parseISO(startDate), 'MMM d')} - ${format(parseISO(endDate), 'MMM d, yyyy')}`;
}

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
      const quantityContext = {
        tripDays: calculator.calculateTripDuration(input.start_date, input.end_date),
        spareDays: input.spare_days,
        washingMachineAvailable: input.washing_machine_available,
        maxDaysBeforeWashing: input.max_days_before_washing,
      };
      // Washing availability is also a tag so items like a laundry kit can depend on it
      // filter() copies, so a reactive (proxied) array from a form is never written to IndexedDB
      const tags: TripTag[] = input.tags.filter((t) => t !== 'laundry');
      if (input.washing_machine_available) tags.push('laundry');

      const categories = await db.categories.where('id').anyOf(input.selected_categories).toArray();
      categories.sort((a, b) => a.sort_order - b.sort_order);
      const templates = await db.item_templates
        .where('category_id')
        .anyOf(input.selected_categories)
        .filter(
          (t) => t.enabled && (t.tags.length === 0 || t.tags.some((tag) => tags.includes(tag)))
        )
        .toArray();

      const checklist: Omit<Checklist, 'id'> = {
        title: checklistTitle(input.start_date, input.end_date),
        start_date: input.start_date,
        end_date: input.end_date,
        spare_days: input.spare_days,
        tags,
        washing_machine_available: input.washing_machine_available,
        max_days_before_washing: input.max_days_before_washing,
        created_at: new Date().toISOString(),
      };

      const categoryOrder = new Map(categories.map((c, i) => [c.id!, i]));
      templates.sort(
        (a, b) =>
          categoryOrder.get(a.category_id)! - categoryOrder.get(b.category_id)! ||
          a.sort_order - b.sort_order
      );

      const checklistId = await db.transaction(
        'rw',
        db.checklists,
        db.checklist_items,
        async () => {
          await db.checklist_items.clear();
          await db.checklists.clear();
          const id = (await db.checklists.add(checklist)) as number;

          const items: Omit<ChecklistItem, 'id'>[] = [];
          for (const template of templates) {
            const quantity = calculator.calculateQuantity(template.quantity, quantityContext);
            if (quantity <= 0) continue;
            items.push({
              checklist_id: id,
              name: template.name,
              category_name: categories.find((c) => c.id === template.category_id)!.name,
              category_id: template.category_id,
              quantity,
              phase: template.phase,
              checked: false,
              sort_order: items.length + 1,
            });
          }
          await db.checklist_items.bulkAdd(items);
          return id;
        }
      );

      return { success: true, data: await this.loadChecklist(checklistId) };
    } catch (error) {
      return {
        success: false,
        error: {
          field: 'general',
          message: toError(error, 'Failed to generate checklist').message,
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
      return { success: true, data: await this.loadChecklist(checklist.id!) };
    } catch (error) {
      return { success: false, error: toError(error, 'Failed to load checklist') };
    }
  }

  /**
   * Update item checked state
   */
  async updateItemChecked(itemId: number, checked: boolean): Promise<Result<ChecklistItem, Error>> {
    return this.updateItem(itemId, { checked });
  }

  /**
   * Set an item's quantity (must be at least 1)
   */
  async updateItemQuantity(
    itemId: number,
    quantity: number
  ): Promise<Result<ChecklistItem, Error>> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { success: false, error: new Error('Quantity must be a whole number of at least 1') };
    }
    return this.updateItem(itemId, { quantity });
  }

  /**
   * Add a one-off item to the current checklist (not saved as a template)
   */
  async addCustomItem(item: {
    name: string;
    category_id: number;
    quantity?: number;
    phase?: PackPhase;
  }): Promise<Result<ChecklistItem, Error>> {
    const name = item.name.trim();
    if (!name) {
      return { success: false, error: new Error('Item name is required') };
    }

    try {
      const checklist = await db.checklists.toCollection().first();
      if (!checklist) {
        return { success: false, error: new Error('No active checklist') };
      }
      const category = await db.categories.get(item.category_id);
      if (!category) {
        return { success: false, error: new Error('Category not found') };
      }

      const lastItem = await db.checklist_items
        .where('checklist_id')
        .equals(checklist.id!)
        .reverse()
        .sortBy('sort_order');
      const newItem: Omit<ChecklistItem, 'id'> = {
        checklist_id: checklist.id!,
        name,
        category_name: category.name,
        category_id: category.id!,
        quantity: Math.max(1, Math.floor(item.quantity ?? 1)),
        phase: item.phase ?? 'ahead',
        checked: false,
        custom: true,
        sort_order: (lastItem[0]?.sort_order ?? 0) + 1,
      };
      const id = (await db.checklist_items.add(newItem)) as number;
      const created = { ...newItem, id };

      const store = useChecklistStore();
      store.addItem(created);
      if (!store.categories.some((c) => c.id === category.id)) {
        store.categories = [...store.categories, category].sort(
          (a, b) => a.sort_order - b.sort_order
        );
      }

      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: toError(error, 'Failed to add item') };
    }
  }

  /**
   * Remove an item from the current checklist
   */
  async deleteItem(itemId: number): Promise<Result<void, Error>> {
    try {
      await db.checklist_items.delete(itemId);
      useChecklistStore().removeItem(itemId);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: toError(error, 'Failed to delete item') };
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

      await db.checklist_items
        .where({ checklist_id: checklist.id!, category_id: categoryId })
        .modify({ checked });

      const store = useChecklistStore();
      store.items.forEach((item) => {
        if (item.category_id === categoryId) item.checked = checked;
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: toError(error, 'Failed to update category checked state') };
    }
  }

  /**
   * Clear/delete the current checklist and all its items
   */
  async clearCurrentChecklist(): Promise<Result<void, Error>> {
    try {
      await db.transaction('rw', db.checklists, db.checklist_items, async () => {
        await db.checklist_items.clear();
        await db.checklists.clear();
      });
      useChecklistStore().clearChecklist();
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: toError(error, 'Failed to clear checklist') };
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

      const { items, categories } = await this.loadChecklist(checklist.id!, false);
      const summary: CategorySummary[] = categories.map((category) => {
        const categoryItems = items.filter((i) => i.category_id === category.id);
        const checkedItems = categoryItems.filter((i) => i.checked).length;
        const totalItems = categoryItems.length;
        return {
          category_id: category.id!,
          category_name: category.name,
          icon: category.icon,
          total_items: totalItems,
          checked_items: checkedItems,
          percentage: totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0,
        };
      });

      return { success: true, data: summary };
    } catch (error) {
      return { success: false, error: toError(error, 'Failed to get category summary') };
    }
  }

  /**
   * Self-contained copy of the current checklist for sharing
   */
  async getSnapshot(includeChecked: boolean): Promise<Result<ChecklistSnapshot | null, Error>> {
    try {
      const checklist = await db.checklists.toCollection().first();
      if (!checklist) {
        return { success: true, data: null };
      }
      const { items } = await this.loadChecklist(checklist.id!, false);
      return {
        success: true,
        data: {
          title: checklist.title,
          start_date: checklist.start_date,
          end_date: checklist.end_date,
          tags: checklist.tags,
          items: items.map((item) => ({
            name: item.name,
            category_name: item.category_name,
            quantity: item.quantity,
            phase: item.phase,
            ...(includeChecked && { checked: item.checked }),
          })),
        },
      };
    } catch (error) {
      return { success: false, error: toError(error, 'Failed to create snapshot') };
    }
  }

  /**
   * Replace the current checklist with a snapshot (e.g. from a share link).
   * Categories are matched by name, case-insensitively; missing ones are created.
   * With `addToLibrary`, items with no template of the same name are saved as templates.
   */
  async importChecklist(
    snapshot: ChecklistSnapshot,
    options: { addToLibrary?: boolean } = {}
  ): Promise<Result<ChecklistWithItems, Error>> {
    try {
      const checklistId = await db.transaction(
        'rw',
        [db.checklists, db.checklist_items, db.categories, db.item_templates, db.preferences],
        async () => {
          const categories = await db.categories.toArray();
          const templates = await db.item_templates.toArray();
          const templateNames = new Set(templates.map((t) => t.name.toLowerCase()));

          const resolveCategory = async (name: string): Promise<Category> => {
            const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
            if (existing) return existing;
            const created = {
              name,
              default_included: false,
              sort_order: Math.max(0, ...categories.map((c) => c.sort_order)) + 1,
            };
            const id = (await db.categories.add(created)) as number;
            const category = { ...created, id };
            categories.push(category);
            const preferences = await db.preferences.get(1);
            if (preferences) {
              await db.preferences.update(1, {
                category_defaults: { ...preferences.category_defaults, [id]: false },
                preferred_categories: [...preferences.preferred_categories, id],
              });
            }
            return category;
          };

          await db.checklist_items.clear();
          await db.checklists.clear();

          // Copy in case the caller passed reactive (proxied) data, which IndexedDB can't store
          const tags = [...(snapshot.tags ?? [])];
          const id = (await db.checklists.add({
            title: snapshot.title || checklistTitle(snapshot.start_date, snapshot.end_date),
            start_date: snapshot.start_date,
            end_date: snapshot.end_date,
            spare_days: 0,
            tags,
            washing_machine_available: tags.includes('laundry'),
            created_at: new Date().toISOString(),
          })) as number;

          const items: Omit<ChecklistItem, 'id'>[] = [];
          const newTemplates: Omit<ItemTemplate, 'id'>[] = [];
          for (const item of snapshot.items) {
            const category = await resolveCategory(item.category_name);
            const quantity = Math.max(1, Math.floor(item.quantity) || 1);
            items.push({
              checklist_id: id,
              name: item.name,
              category_name: category.name,
              category_id: category.id!,
              quantity,
              phase: item.phase,
              checked: item.checked ?? false,
              sort_order: items.length + 1,
            });

            if (options.addToLibrary && !templateNames.has(item.name.toLowerCase())) {
              templateNames.add(item.name.toLowerCase());
              newTemplates.push({
                name: item.name,
                category_id: category.id!,
                enabled: true,
                tags: [],
                quantity: { kind: 'fixed', count: quantity },
                phase: item.phase,
                sort_order:
                  Math.max(
                    0,
                    ...templates
                      .filter((t) => t.category_id === category.id)
                      .map((t) => t.sort_order)
                  ) +
                  newTemplates.length +
                  1,
              });
            }
          }

          await db.checklist_items.bulkAdd(items);
          await db.item_templates.bulkAdd(newTemplates);
          return id;
        }
      );

      return { success: true, data: await this.loadChecklist(checklistId) };
    } catch (error) {
      return { success: false, error: toError(error, 'Failed to import checklist') };
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

    if (input.spare_days < 0) {
      errors.push({ field: 'spare_days', message: 'Spare days cannot be negative' });
    }

    if (input.washing_machine_available && input.max_days_before_washing !== undefined) {
      if (!Number.isInteger(input.max_days_before_washing) || input.max_days_before_washing < 1) {
        errors.push({
          field: 'max_days_before_washing',
          message: 'Max days before washing must be a whole number of at least 1',
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

  private async updateItem(
    itemId: number,
    changes: Partial<Pick<ChecklistItem, 'checked' | 'quantity'>>
  ): Promise<Result<ChecklistItem, Error>> {
    try {
      await db.checklist_items.update(itemId, changes);
      const item = await db.checklist_items.get(itemId);
      if (!item) {
        return { success: false, error: new Error('Item not found') };
      }
      useChecklistStore().patchItem(itemId, changes);
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: toError(error, 'Failed to update item') };
    }
  }

  /**
   * Load a checklist with its items (in sort order) and their categories, optionally
   * pushing it into the store
   */
  private async loadChecklist(
    checklistId: number,
    updateStore = true
  ): Promise<ChecklistWithItems> {
    const checklist = await db.checklists.get(checklistId);
    if (!checklist) throw new Error('Checklist not found');

    const items = await db.checklist_items
      .where('checklist_id')
      .equals(checklistId)
      .sortBy('sort_order');
    const categoryIds = [...new Set(items.map((i) => i.category_id))];
    const categories = await db.categories.where('id').anyOf(categoryIds).sortBy('sort_order');

    const data: ChecklistWithItems = { checklist, items, categories };
    if (updateStore) useChecklistStore().setChecklist(data);
    return data;
  }
}
