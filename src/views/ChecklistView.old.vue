<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ checklist?.title }}</h1>
        <div class="flex items-center justify-between">
          <p class="text-gray-600">
            {{ checklist?.start_date }} to {{ checklist?.end_date }} ({{ tripDays }} days +
            {{ checklist?.buffer_days }} buffer)
          </p>
          <div class="text-sm text-gray-600">
            <span class="font-medium">{{ checklistStore.checkedItems }}</span> of
            <span class="font-medium">{{ checklistStore.totalItems }}</span> packed
            <span class="ml-2">({{ checklistStore.progress }}%)</span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading checklist...</p>
      </div>

      <!-- No Checklist -->
      <div v-else-if="!checklist" class="text-center py-12">
        <p class="text-gray-500 mb-4">No checklist found</p>
        <BaseButton variant="primary" @click="router.push('/')"> Create Checklist </BaseButton>
      </div>

      <!-- Checklist Content -->
      <div v-else class="space-y-6">
        <!-- Category Summary -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Progress by Category</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CategorySummary
              v-for="summary in categorySummary"
              :key="summary.category_id"
              :category-id="summary.category_id"
              :category-name="summary.category_name"
              :total-items="summary.total_items"
              :checked-count="summary.checked_items"
              @toggle-category="handleCategoryToggle"
            />
          </div>
        </div>

        <!-- Items by Category -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Packing List</h2>
          <div class="space-y-6">
            <div
              v-for="category in categories"
              :key="category.id"
              class="border-b border-gray-200 pb-4 last:border-0"
            >
              <h3 class="font-medium text-gray-900 mb-3">{{ category.name }}</h3>
              <div class="space-y-2">
                <div
                  v-for="item in getItemsByCategory(category.id!)"
                  :key="item.id"
                  class="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2"
                >
                  <div class="flex items-center flex-1">
                    <input
                      :id="`item-${item.id}`"
                      type="checkbox"
                      :checked="item.checked"
                      @change="handleItemCheck(item.id!, $event)"
                      class="touch-target w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label
                      :for="`item-${item.id}`"
                      class="ml-3 text-gray-700 cursor-pointer"
                      :class="{ 'line-through text-gray-400': item.checked }"
                    >
                      {{ item.name }}
                    </label>
                  </div>
                  <span class="text-sm text-gray-500">x{{ item.quantity }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-center">
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
import BaseButton from '@/components/common/BaseButton.vue';
import CategorySummary from '@/components/checklist/CategorySummary.vue';
import { useChecklist } from '@/composables/useChecklist';
import { useChecklistStore } from '@/stores/checklist';
import { usePerDayCalculator } from '@/composables/usePerDayCalculator';
import type {
  Checklist,
  ChecklistItem,
  Category,
  CategorySummary as CategorySummaryType,
} from '@/types';

const router = useRouter();
const { getCurrentChecklist, updateItemChecked, updateCategoryChecked, getCategorySummary } =
  useChecklist();
const checklistStore = useChecklistStore();
const calculator = usePerDayCalculator();

const loading = ref(true);
const checklist = ref<Checklist | null>(null);
const items = ref<ChecklistItem[]>([]);
const categories = ref<Category[]>([]);
const categorySummary = ref<CategorySummaryType[]>([]);

const tripDays = computed(() => {
  if (!checklist.value) return 0;
  return calculator.calculateTripDuration(checklist.value.start_date, checklist.value.end_date);
});

onMounted(async () => {
  const result = await getCurrentChecklist();

  if (result.success && result.data) {
    checklist.value = result.data.checklist;
    items.value = result.data.items;
    categories.value = result.data.categories;

    // Load category summary
    categorySummary.value = await getCategorySummary();
  }

  loading.value = false;
});

function getItemsByCategory(categoryId: number): ChecklistItem[] {
  return items.value.filter((item) => item.category_id === categoryId);
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

  // Refresh category summary
  categorySummary.value = await getCategorySummary();
}

async function handleCategoryToggle(categoryId: number, checked: boolean) {
  await updateCategoryChecked(categoryId, checked);

  // Update local state for all items in category
  items.value.forEach((item) => {
    if (item.category_id === categoryId) {
      item.checked = checked;
    }
  });

  // Refresh category summary
  categorySummary.value = await getCategorySummary();
}
</script>
