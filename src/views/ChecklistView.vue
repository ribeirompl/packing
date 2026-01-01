<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 pb-20">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">{{ checklist?.title }}</h1>

        <!-- Trip Details -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <span class="text-gray-500">Start:</span>
            <span class="ml-2 font-medium text-gray-900">{{
              formatDate(checklist?.start_date)
            }}</span>
          </div>
          <div>
            <span class="text-gray-500">End:</span>
            <span class="ml-2 font-medium text-gray-900">{{
              formatDate(checklist?.end_date)
            }}</span>
          </div>
          <div>
            <span class="text-gray-500">Duration:</span>
            <span class="ml-2 font-medium text-gray-900"
              >{{ tripDays }} days + {{ checklist?.buffer_days }} buffer</span
            >
          </div>
        </div>

        <!-- Overall Progress Bar -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-gray-700">Overall Progress</span>
            <span class="text-gray-600">
              <span class="font-bold text-indigo-600">{{ checklistStore.checkedItems }}</span> of
              <span class="font-bold">{{ checklistStore.totalItems }}</span> packed
              <span class="ml-2 text-indigo-600">({{ checklistStore.progress }}%)</span>
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-300"
              :style="{ width: `${checklistStore.progress}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading checklist...</p>
      </div>

      <!-- No Checklist -->
      <div v-else-if="!checklist" class="text-center py-12 bg-white rounded-lg shadow-md p-8">
        <p class="text-gray-500 mb-4">No checklist found</p>
        <BaseButton variant="primary" @click="router.push('/')"> Create Checklist </BaseButton>
      </div>

      <!-- Checklist Content -->
      <div v-else class="space-y-6">
        <!-- View Mode Toggle -->
        <div class="bg-white rounded-lg shadow-md p-2 flex gap-2">
          <button
            @click="viewMode = 'category'"
            :class="[
              'flex-1 py-3 px-4 rounded-lg font-medium transition-all',
              viewMode === 'category'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100',
            ]"
          >
            📦 By Category
          </button>
          <button
            @click="viewMode = 'day'"
            :class="[
              'flex-1 py-3 px-4 rounded-lg font-medium transition-all',
              viewMode === 'day'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100',
            ]"
          >
            📅 By Day
          </button>
        </div>

        <!-- By Category View -->
        <div v-if="viewMode === 'category'" class="space-y-4">
          <div
            v-for="category in categories"
            :key="category.id"
            class="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <!-- Category Header with Bulk Toggle -->
            <div
              class="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-200"
            >
              <CategorySummary
                :category-id="category.id!"
                :category-name="category.name"
                :total-items="getCategoryItemCount(category.id!)"
                :checked-count="getCategoryCheckedCount(category.id!)"
                @toggle-category="handleCategoryToggle"
              />
            </div>

            <!-- Category Items -->
            <div class="p-6">
              <div class="space-y-3">
                <div
                  v-for="itemGroup in getGroupedItemsByCategory(category.id!)"
                  :key="itemGroup.name"
                  class="flex items-center justify-between py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                >
                  <div class="flex items-center flex-1">
                    <input
                      :id="`item-group-${category.id}-${itemGroup.name}`"
                      type="checkbox"
                      :checked="itemGroup.allChecked"
                      :indeterminate.prop="itemGroup.someChecked && !itemGroup.allChecked"
                      @change="handleItemGroupCheck(itemGroup.items, $event)"
                      class="w-5 h-5 text-indigo-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label
                      :for="`item-group-${category.id}-${itemGroup.name}`"
                      class="ml-4 text-gray-800 font-medium cursor-pointer select-none"
                      :class="{ 'line-through text-gray-400': itemGroup.allChecked }"
                    >
                      {{ itemGroup.name }} ×{{ itemGroup.totalQuantity }}
                    </label>
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ itemGroup.checkedCount }}/{{ itemGroup.items.length }} checked
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- By Day View -->
        <div v-if="viewMode === 'day'" class="space-y-4">
          <div
            v-for="dayGroup in itemsByDay"
            :key="dayGroup.day"
            class="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <!-- Day Header -->
            <div
              class="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200"
            >
              <h3 class="text-xl font-bold text-gray-900">{{ dayGroup.dayLabel }}</h3>
              <p class="text-sm text-gray-600 mt-1">{{ dayGroup.date }}</p>
            </div>

            <!-- Day Items by Category -->
            <div class="p-6">
              <div class="space-y-6">
                <div
                  v-for="categoryGroup in dayGroup.categories"
                  :key="categoryGroup.category_id"
                  class="space-y-2"
                >
                  <h4 class="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
                    {{ categoryGroup.category_name }}
                  </h4>
                  <div class="space-y-2 pl-4">
                    <div
                      v-for="item in categoryGroup.items"
                      :key="item.id"
                      class="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div class="flex items-center flex-1">
                        <input
                          :id="`day-item-${item.id}`"
                          type="checkbox"
                          :checked="item.checked"
                          @change="handleItemCheck(item.id!, $event)"
                          class="w-5 h-5 text-indigo-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label
                          :for="`day-item-${item.id}`"
                          class="ml-3 text-gray-700 cursor-pointer select-none"
                          :class="{ 'line-through text-gray-400': item.checked }"
                        >
                          {{ item.name }}
                        </label>
                      </div>
                      <span class="text-sm font-medium text-gray-500">×{{ item.quantity }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-center gap-4">
          <BaseButton variant="outline" @click="router.push('/')">
            Back to Questionnaire
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { format } from 'date-fns';
import BaseButton from '@/components/common/BaseButton.vue';
import CategorySummary from '@/components/checklist/CategorySummary.vue';
import { useChecklist } from '@/composables/useChecklist';
import { useChecklistStore } from '@/stores/checklist';
import { usePerDayCalculator } from '@/composables/usePerDayCalculator';
import type { Checklist, ChecklistItem, Category, DayBreakdown } from '@/types';

const router = useRouter();
const { getCurrentChecklist, updateItemChecked, updateCategoryChecked } = useChecklist();
const checklistStore = useChecklistStore();
const calculator = usePerDayCalculator();

const loading = ref(true);
const checklist = ref<Checklist | null>(null);
const items = ref<ChecklistItem[]>([]);
const categories = ref<Category[]>([]);
const viewMode = ref<'category' | 'day'>('category');

const tripDays = computed(() => {
  if (!checklist.value) return 0;
  return calculator.calculateTripDuration(checklist.value.start_date, checklist.value.end_date);
});

const itemsByDay = computed(() => {
  if (!checklist.value) return [];

  const dayGroups: DayBreakdown[] = [];
  const totalDays = tripDays.value + (checklist.value.buffer_days || 0);

  // First, add non-daily items (singular items for entire trip)
  const nonDailyItems = items.value.filter((item) => !item.day);
  if (nonDailyItems.length > 0) {
    const categoryGroups = new Map<number, ChecklistItem[]>();
    nonDailyItems.forEach((item) => {
      if (!categoryGroups.has(item.category_id)) {
        categoryGroups.set(item.category_id, []);
      }
      categoryGroups.get(item.category_id)!.push(item);
    });

    const categories = Array.from(categoryGroups.entries()).map(([categoryId, items]) => ({
      category_id: categoryId,
      category_name: items[0]!.category_name,
      items: items,
    }));

    dayGroups.push({
      day: 0,
      date: `${checklist.value.start_date} to ${checklist.value.end_date}`,
      dayLabel: 'For Entire Trip',
      items: nonDailyItems,
      categories,
    });
  }

  // Then add daily items grouped by day
  for (let day = 1; day <= totalDays; day++) {
    const dayDate = calculator.getDayDate(checklist.value.start_date, day);
    const dayItems = items.value.filter((item) => item.day === day);

    if (dayItems.length === 0) continue;

    // Group by category
    const categoryGroups = new Map<number, ChecklistItem[]>();
    dayItems.forEach((item) => {
      if (!categoryGroups.has(item.category_id)) {
        categoryGroups.set(item.category_id, []);
      }
      categoryGroups.get(item.category_id)!.push(item);
    });

    const categories = Array.from(categoryGroups.entries()).map(([categoryId, items]) => ({
      category_id: categoryId,
      category_name: items[0]!.category_name,
      items: items,
    }));

    const isBufferDay = day > tripDays.value;
    const dayLabel = isBufferDay ? `Buffer Day ${day - tripDays.value}` : `Day ${day}`;

    dayGroups.push({
      day,
      date: dayDate,
      dayLabel,
      items: dayItems,
      categories,
    });
  }

  return dayGroups;
});

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  return format(new Date(dateStr), 'MMM d, yyyy');
}

onMounted(async () => {
  const result = await getCurrentChecklist();

  if (result.success && result.data) {
    checklist.value = result.data.checklist;
    items.value = result.data.items;
    categories.value = result.data.categories;
  }

  loading.value = false;
});

function getItemsByCategory(categoryId: number): ChecklistItem[] {
  return items.value.filter((item) => item.category_id === categoryId);
}

function getGroupedItemsByCategory(categoryId: number) {
  const categoryItems = getItemsByCategory(categoryId);
  const grouped = new Map<string, ChecklistItem[]>();

  categoryItems.forEach((item) => {
    if (!grouped.has(item.name)) {
      grouped.set(item.name, []);
    }
    grouped.get(item.name)!.push(item);
  });

  return Array.from(grouped.entries()).map(([name, items]) => ({
    name,
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    checkedCount: items.filter((item) => item.checked).length,
    allChecked: items.every((item) => item.checked),
    someChecked: items.some((item) => item.checked),
  }));
}

function getCategoryItemCount(categoryId: number): number {
  return getItemsByCategory(categoryId).length;
}

function getCategoryCheckedCount(categoryId: number): number {
  return getItemsByCategory(categoryId).filter((item) => item.checked).length;
}

async function handleItemCheck(itemId: number, event: Event) {
  const target = event.target as HTMLInputElement;
  const checked = target.checked;

  await updateItemChecked(itemId, checked);

  // Update local state
  const item = items.value.find((i) => i.id === itemId);
  if (item) {
    item.checked = checked;
  }
}

async function handleItemGroupCheck(groupItems: ChecklistItem[], event: Event) {
  const target = event.target as HTMLInputElement;
  const checked = target.checked;

  // Update all items in the group
  for (const item of groupItems) {
    await updateItemChecked(item.id!, checked);
    item.checked = checked;
  }
}

async function handleCategoryToggle(categoryId: number, checked: boolean) {
  await updateCategoryChecked(categoryId, checked);

  // Update local state for all items in category
  items.value.forEach((item) => {
    if (item.category_id === categoryId) {
      item.checked = checked;
    }
  });
}
</script>
