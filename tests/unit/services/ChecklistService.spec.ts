import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ChecklistService } from '../../../src/services/ChecklistService';
import { db } from '../../../src/db/schema';
import { useChecklistStore } from '../../../src/stores/checklist';
import type { ItemTemplate, QuestionnaireInput } from '../../../src/types';

type TemplateSeed = Omit<ItemTemplate, 'id' | 'category_id' | 'sort_order' | 'enabled'> & {
  enabled?: boolean;
};

const one = { kind: 'fixed', count: 1 } as const;

describe('ChecklistService', () => {
  const service = new ChecklistService();
  let clothesId: number;
  let electronicsId: number;

  async function addTemplates(categoryId: number, templates: TemplateSeed[]) {
    await db.item_templates.bulkAdd(
      templates.map((t, i) => ({
        enabled: true,
        ...t,
        category_id: categoryId,
        sort_order: i + 1,
      }))
    );
  }

  function input(overrides: Partial<QuestionnaireInput> = {}): QuestionnaireInput {
    return {
      start_date: '2024-06-01',
      end_date: '2024-06-05',
      spare_days: 1,
      tags: [],
      washing_machine_available: false,
      max_days_before_washing: undefined,
      selected_categories: [clothesId, electronicsId],
      ...overrides,
    };
  }

  async function generate(overrides: Partial<QuestionnaireInput> = {}) {
    const result = await service.generateChecklist(input(overrides));
    if (!result.success) throw new Error(result.error.message);
    return result.data;
  }

  const names = (items: { name: string }[]) => items.map((i) => i.name);

  beforeEach(async () => {
    // Services update Pinia stores, so each test needs an active Pinia instance
    setActivePinia(createPinia());

    await db.delete();
    await db.open();

    clothesId = (await db.categories.add({
      name: 'Clothes',
      sort_order: 1,
      default_included: true,
    })) as number;
    electronicsId = (await db.categories.add({
      name: 'Electronics',
      sort_order: 2,
      default_included: true,
    })) as number;

    await addTemplates(clothesId, [
      {
        name: 'Socks',
        tags: [],
        quantity: { kind: 'per_day', rate: 1, spare: true },
        phase: 'ahead',
      },
      {
        name: 'Pants',
        tags: [],
        quantity: { kind: 'per_n_days', n: 3, min: 1, max: 3 },
        phase: 'ahead',
      },
      { name: 'Shorts', tags: ['hot', 'beach'], quantity: one, phase: 'ahead' },
      { name: 'Suit', tags: ['formal'], quantity: one, phase: 'ahead' },
      { name: 'Laundry kit', tags: ['laundry'], quantity: one, phase: 'ahead' },
    ]);
    await addTemplates(electronicsId, [
      { name: 'Phone charger', tags: [], quantity: one, phase: 'last_minute' },
      { name: 'Camera', tags: [], quantity: one, phase: 'ahead', enabled: false },
    ]);
  });

  describe('generateChecklist', () => {
    it('creates a checklist with one row per item', async () => {
      const data = await generate();

      expect(data.checklist.title).toBe('Jun 1 - Jun 5, 2024');
      expect(data.checklist.spare_days).toBe(1);
      expect(names(data.items)).toEqual(['Socks', 'Pants', 'Phone charger']);
      expect(data.categories.map((c) => c.name)).toEqual(['Clothes', 'Electronics']);
    });

    it('computes quantities from item rules', async () => {
      // 5-day trip + 1 spare: socks 6, pants ceil(5/3) = 2
      const data = await generate();
      const quantities = Object.fromEntries(data.items.map((i) => [i.name, i.quantity]));
      expect(quantities).toEqual({ Socks: 6, Pants: 2, 'Phone charger': 1 });
    });

    it('caps per-day quantities by the washing interval', async () => {
      const data = await generate({
        end_date: '2024-06-14',
        washing_machine_available: true,
        max_days_before_washing: 5,
      });
      expect(data.items.find((i) => i.name === 'Socks')?.quantity).toBe(6);
    });

    it('includes tagged items only when one of their tags is active', async () => {
      expect(names((await generate()).items)).not.toContain('Shorts');
      expect(names((await generate({ tags: ['beach'] })).items)).toContain('Shorts');
      expect(names((await generate({ tags: ['hot', 'formal'] })).items)).toEqual(
        expect.arrayContaining(['Shorts', 'Suit'])
      );
    });

    it('adds the laundry tag when washing is available', async () => {
      const data = await generate({ washing_machine_available: true, max_days_before_washing: 3 });
      expect(data.checklist.tags).toContain('laundry');
      expect(names(data.items)).toContain('Laundry kit');
    });

    it('excludes disabled templates and unselected categories', async () => {
      const data = await generate({ selected_categories: [electronicsId] });
      expect(names(data.items)).toEqual(['Phone charger']);
    });

    it('copies the pack phase from the template', async () => {
      const data = await generate();
      expect(data.items.find((i) => i.name === 'Phone charger')?.phase).toBe('last_minute');
    });

    it('validates required fields', async () => {
      const result = await service.generateChecklist(input({ start_date: '' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe('start_date');
      }
    });

    it('replaces the existing checklist', async () => {
      await generate();
      await generate({ start_date: '2024-07-01', end_date: '2024-07-10' });

      const checklists = await db.checklists.toArray();
      expect(checklists).toHaveLength(1);
      expect(checklists[0]!.title).toBe('Jul 1 - Jul 10, 2024');
      expect(await db.checklist_items.count()).toBe(3);
    });
  });

  describe('getCurrentChecklist', () => {
    it('returns null when no checklist exists', async () => {
      const result = await service.getCurrentChecklist();
      expect(result).toEqual({ success: true, data: null });
    });

    it('returns the checklist with items and categories', async () => {
      await generate();
      const result = await service.getCurrentChecklist();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.items).toHaveLength(3);
        expect(result.data!.categories).toHaveLength(2);
      }
    });
  });

  describe('item edits', () => {
    it('persists checked state', async () => {
      const data = await generate();
      const id = data.items[0]!.id!;

      await service.updateItemChecked(id, true);
      expect((await db.checklist_items.get(id))?.checked).toBe(true);
      expect(useChecklistStore().checkedItems).toBe(1);

      await service.updateItemChecked(id, false);
      expect((await db.checklist_items.get(id))?.checked).toBe(false);
    });

    it('updates quantity and rejects invalid values', async () => {
      const id = (await generate()).items[0]!.id!;

      expect((await service.updateItemQuantity(id, 9)).success).toBe(true);
      expect((await db.checklist_items.get(id))?.quantity).toBe(9);

      expect((await service.updateItemQuantity(id, 0)).success).toBe(false);
      expect((await service.updateItemQuantity(id, 1.5)).success).toBe(false);
      expect((await db.checklist_items.get(id))?.quantity).toBe(9);
    });

    it('adds a custom item at the end of the list', async () => {
      await generate();
      const result = await service.addCustomItem({
        name: '  Kindle  ',
        category_id: electronicsId,
        quantity: 2,
      });

      expect(result.success).toBe(true);
      const items = useChecklistStore().items;
      expect(items.at(-1)).toMatchObject({
        name: 'Kindle',
        quantity: 2,
        custom: true,
        phase: 'ahead',
        category_name: 'Electronics',
      });
    });

    it('rejects a custom item without a name or checklist', async () => {
      expect((await service.addCustomItem({ name: 'X', category_id: clothesId })).success).toBe(
        false
      );
      await generate();
      expect((await service.addCustomItem({ name: '  ', category_id: clothesId })).success).toBe(
        false
      );
    });

    it('deletes an item', async () => {
      const id = (await generate()).items[0]!.id!;
      await service.deleteItem(id);
      expect(await db.checklist_items.get(id)).toBeUndefined();
      expect(useChecklistStore().items.some((i) => i.id === id)).toBe(false);
    });
  });

  describe('clearCurrentChecklist', () => {
    it('deletes the checklist and all items', async () => {
      await generate();
      await service.clearCurrentChecklist();
      expect(await db.checklists.count()).toBe(0);
      expect(await db.checklist_items.count()).toBe(0);
    });
  });

  describe('category progress', () => {
    it('toggles all items in a category and reports progress', async () => {
      await generate();
      await service.updateCategoryChecked(clothesId, true);

      const items = await db.checklist_items.where('category_id').equals(clothesId).toArray();
      expect(items.every((i) => i.checked)).toBe(true);

      const result = await service.getCategorySummary();
      expect(result.success).toBe(true);
      const summary = result.success ? result.data : [];
      expect(summary.find((s) => s.category_id === clothesId)).toMatchObject({
        checked_items: 2,
        total_items: 2,
        percentage: 100,
      });
      expect(summary.find((s) => s.category_id === electronicsId)?.percentage).toBe(0);

      await service.updateCategoryChecked(clothesId, false);
      const unchecked = await db.checklist_items.where('category_id').equals(clothesId).toArray();
      expect(unchecked.every((i) => !i.checked)).toBe(true);
    });
  });

  describe('snapshots and import', () => {
    it('round-trips a checklist including custom items', async () => {
      const data = await generate({ tags: ['beach'] });
      await service.updateItemChecked(data.items[0]!.id!, true);
      await service.addCustomItem({ name: 'Snorkel', category_id: clothesId });

      const snapshot = await service.getSnapshot(true);
      expect(snapshot.success).toBe(true);
      if (!snapshot.success || !snapshot.data) return;

      await service.clearCurrentChecklist();
      const imported = await service.importChecklist(snapshot.data);
      expect(imported.success).toBe(true);
      if (!imported.success) return;

      expect(imported.data.checklist.tags).toEqual(['beach']);
      expect(names(imported.data.items)).toEqual([
        'Socks',
        'Pants',
        'Shorts',
        'Phone charger',
        'Snorkel',
      ]);
      expect(imported.data.items[0]!.checked).toBe(true);
    });

    it('omits checked state unless requested', async () => {
      const data = await generate();
      await service.updateItemChecked(data.items[0]!.id!, true);
      const snapshot = await service.getSnapshot(false);
      expect(snapshot.success && snapshot.data!.items.every((i) => i.checked === undefined)).toBe(
        true
      );
    });

    it('matches categories by name and creates missing ones', async () => {
      const result = await service.importChecklist({
        title: 'Shared trip',
        start_date: '2024-08-01',
        end_date: '2024-08-03',
        tags: [],
        items: [
          { name: 'Socks', category_name: 'clothes', quantity: 3, phase: 'ahead' },
          { name: 'Fishing rod', category_name: 'Fishing', quantity: 1, phase: 'ahead' },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.checklist.title).toBe('Shared trip');
      expect(result.data.items[0]!.category_id).toBe(clothesId);
      const fishing = (await db.categories.toArray()).find((c) => c.name === 'Fishing');
      expect(fishing?.default_included).toBe(false);
      expect(result.data.items[1]!.category_id).toBe(fishing?.id);
      // Not added to the library unless requested
      const templates = await db.item_templates.toArray();
      expect(templates.some((t) => t.name === 'Fishing rod')).toBe(false);
    });

    it('adds unknown items to the library when requested', async () => {
      await service.importChecklist(
        {
          title: '',
          start_date: '2024-08-01',
          end_date: '2024-08-03',
          tags: [],
          items: [
            { name: 'socks', category_name: 'Clothes', quantity: 3, phase: 'ahead' },
            { name: 'Snorkel', category_name: 'Clothes', quantity: 2, phase: 'ahead' },
          ],
        },
        { addToLibrary: true }
      );

      const templates = await db.item_templates.where('category_id').equals(clothesId).toArray();
      expect(templates.filter((t) => t.name.toLowerCase() === 'socks')).toHaveLength(1);
      expect(templates.find((t) => t.name === 'Snorkel')).toMatchObject({
        tags: [],
        quantity: { kind: 'fixed', count: 2 },
        enabled: true,
      });
    });
  });
});
