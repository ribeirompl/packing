<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 pb-20">
    <div class="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading checklist...</p>
      </div>

      <!-- No Checklist -->
      <div v-else-if="!checklist" class="text-center bg-white rounded-lg shadow-md p-8">
        <p class="text-gray-500 mb-4">No checklist found</p>
        <BaseButton variant="primary" @click="router.push('/')">Create Checklist</BaseButton>
      </div>

      <template v-else>
        <!-- Header -->
        <header class="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">{{ checklist.title }}</h1>
              <p class="mt-1 text-sm text-gray-600">
                {{ formatDate(checklist.start_date) }} – {{ formatDate(checklist.end_date) }}
                <span class="text-gray-400">·</span>
                {{ tripDays }} {{ tripDays === 1 ? 'day' : 'days' }}
                <template v-if="checklist.spare_days > 0">
                  + {{ checklist.spare_days }} spare</template
                >
              </p>
            </div>
            <ShareChecklistButton />
          </div>

          <ul v-if="tripTagLabels.length" class="flex flex-wrap gap-1.5" aria-label="Trip details">
            <li
              v-for="label in tripTagLabels"
              :key="label"
              class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
            >
              {{ label }}
            </li>
          </ul>

          <!-- Overall Progress -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-gray-700">Progress</span>
              <span class="text-gray-600">
                <span class="font-bold text-indigo-600">{{ checklistStore.checkedItems }}</span>
                of
                <span class="font-bold">{{ checklistStore.totalItems }}</span> packed
                <span class="ml-1 text-indigo-600">({{ checklistStore.progress }}%)</span>
              </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-300"
                :style="{ width: `${checklistStore.progress}%` }"
              ></div>
            </div>
          </div>
        </header>

        <!-- View controls -->
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <div
            class="flex flex-1 gap-1 rounded-lg bg-white p-1 shadow-md"
            role="radiogroup"
            aria-label="Group items"
          >
            <button
              v-for="mode in viewModes"
              :key="mode.value"
              type="button"
              role="radio"
              :aria-checked="viewMode === mode.value"
              :class="[
                'min-h-[40px] flex-1 rounded-md px-3 text-sm font-medium transition-colors',
                viewMode === mode.value
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100',
              ]"
              @click="viewMode = mode.value"
            >
              {{ mode.label }}
            </button>
          </div>
          <label
            class="flex min-h-[48px] cursor-pointer select-none items-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-gray-700 shadow-md"
          >
            <input
              v-model="hidePacked"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Hide packed
          </label>
        </div>

        <!-- By Category -->
        <div v-if="viewMode === 'category'" class="space-y-4">
          <section
            v-for="category in checklistStore.categories"
            :key="category.id"
            class="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div
              class="bg-gradient-to-r from-indigo-50 to-blue-50 px-3 pt-1 pb-3 sm:px-4 border-b border-gray-200"
            >
              <CategorySummary
                :category-id="category.id!"
                :category-name="category.name"
                :total-items="categoryItems(category.id!).length"
                :checked-count="categoryItems(category.id!).filter((i) => i.checked).length"
                @toggle-category="handleCategoryToggle"
              />
            </div>
            <div class="px-3 py-2 sm:px-4">
              <ul class="divide-y divide-gray-100">
                <ChecklistItemRow
                  v-for="item in visible(categoryItems(category.id!))"
                  :key="item.id"
                  :item="item"
                  @toggle="(checked) => handleCheck(item, checked)"
                  @change-quantity="(qty) => handleQuantity(item, qty)"
                  @delete="handleDelete(item)"
                />
              </ul>
              <p
                v-if="hidePacked && allPacked(categoryItems(category.id!))"
                class="py-2 text-sm text-gray-500"
              >
                All packed
              </p>
              <AddItemForm :category-id="category.id!" class="mt-1" />
            </div>
          </section>
        </div>

        <!-- By Phase -->
        <div v-else class="space-y-4">
          <section
            v-for="section in phaseSections"
            :key="section.phase"
            class="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div
              class="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-200"
            >
              <h2 class="text-lg font-bold text-gray-900">
                {{ PACK_PHASE_LABELS[section.phase] }}
              </h2>
              <span class="text-sm text-gray-600">{{ section.checked }}/{{ section.total }}</span>
            </div>
            <div class="px-3 py-2 sm:px-4 space-y-3">
              <div v-for="group in section.groups" :key="group.category.id">
                <h3 class="pt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {{ group.category.name }}
                </h3>
                <ul class="divide-y divide-gray-100">
                  <ChecklistItemRow
                    v-for="item in group.items"
                    :key="item.id"
                    :item="item"
                    @toggle="(checked) => handleCheck(item, checked)"
                    @change-quantity="(qty) => handleQuantity(item, qty)"
                    @delete="handleDelete(item)"
                  />
                </ul>
              </div>
              <p v-if="section.groups.length === 0" class="py-2 text-sm text-gray-500">
                All packed
              </p>
            </div>
          </section>
          <p
            v-if="phaseSections.length === 0"
            class="bg-white rounded-lg shadow-md p-6 text-center text-gray-500"
          >
            No items in this checklist
          </p>
        </div>

        <!-- Actions -->
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <BaseButton variant="outline" @click="router.push('/')">New trip</BaseButton>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { format, parseISO } from 'date-fns';
import BaseButton from '@/components/common/BaseButton.vue';
import CategorySummary from '@/components/checklist/CategorySummary.vue';
import ChecklistItemRow from '@/components/checklist/ChecklistItemRow.vue';
import AddItemForm from '@/components/checklist/AddItemForm.vue';
import ShareChecklistButton from '@/components/checklist/ShareChecklistButton.vue';
import { useChecklist } from '@/composables/useChecklist';
import { useToast } from '@/composables/useToast';
import { useChecklistStore } from '@/stores/checklist';
import { usePerDayCalculator } from '@/composables/usePerDayCalculator';
import { PACK_PHASES, PACK_PHASE_LABELS, TRIP_TAG_LABELS } from '@/types';
import type { Category, ChecklistItem, PackPhase } from '@/types';

type ViewMode = 'category' | 'phase';

const HIDE_PACKED_KEY = 'packing.hidePacked';
const viewModes: { value: ViewMode; label: string }[] = [
  { value: 'category', label: 'By Category' },
  { value: 'phase', label: 'By Phase' },
];

const router = useRouter();
const {
  getCurrentChecklist,
  updateItemChecked,
  updateItemQuantity,
  deleteItem,
  updateCategoryChecked,
} = useChecklist();
const { showError, showInfo } = useToast();
const checklistStore = useChecklistStore();
const calculator = usePerDayCalculator();

const loading = ref(!checklistStore.hasChecklist);
const viewMode = ref<ViewMode>('category');
const hidePacked = ref(readHidePacked());

watch(hidePacked, (value) => {
  try {
    localStorage.setItem(HIDE_PACKED_KEY, value ? '1' : '0');
  } catch {
    // Storage unavailable (e.g. private mode); the setting just won't be remembered
  }
});

function readHidePacked(): boolean {
  try {
    return localStorage.getItem(HIDE_PACKED_KEY) === '1';
  } catch {
    return false;
  }
}

const checklist = computed(() => checklistStore.checklist);

const tripDays = computed(() =>
  checklist.value
    ? calculator.calculateTripDuration(checklist.value.start_date, checklist.value.end_date)
    : 0
);

const tripTagLabels = computed(() =>
  (checklist.value?.tags ?? []).map((tag) => TRIP_TAG_LABELS[tag])
);

const itemsByCategory = computed(() => {
  const map = new Map<number, ChecklistItem[]>();
  for (const item of checklistStore.items) {
    const list = map.get(item.category_id);
    if (list) list.push(item);
    else map.set(item.category_id, [item]);
  }
  return map;
});

const phaseSections = computed(() => {
  const sections: {
    phase: PackPhase;
    total: number;
    checked: number;
    groups: { category: Category; items: ChecklistItem[] }[];
  }[] = [];

  for (const phase of PACK_PHASES) {
    const phaseItems = checklistStore.items.filter((i) => i.phase === phase);
    if (phaseItems.length === 0) continue;

    const groups = checklistStore.categories
      .map((category) => ({
        category,
        items: visible(phaseItems.filter((i) => i.category_id === category.id)),
      }))
      .filter((g) => g.items.length > 0);

    sections.push({
      phase,
      total: phaseItems.length,
      checked: phaseItems.filter((i) => i.checked).length,
      groups,
    });
  }
  return sections;
});

onMounted(async () => {
  window.scrollTo(0, 0);
  // Refresh from the database; this also populates the store
  await getCurrentChecklist();
  loading.value = false;
});

function categoryItems(categoryId: number): ChecklistItem[] {
  return itemsByCategory.value.get(categoryId) ?? [];
}

function visible(items: ChecklistItem[]): ChecklistItem[] {
  return hidePacked.value ? items.filter((i) => !i.checked) : items;
}

function allPacked(items: ChecklistItem[]): boolean {
  return items.length > 0 && items.every((i) => i.checked);
}

function formatDate(dateStr: string): string {
  // parseISO treats 'yyyy-MM-dd' as local time; new Date() would parse it as UTC
  return format(parseISO(dateStr), 'EEE, MMM d');
}

async function handleCheck(item: ChecklistItem, checked: boolean) {
  const result = await updateItemChecked(item.id!, checked);
  if (!result.success) showError(result.error.message);
}

async function handleQuantity(item: ChecklistItem, quantity: number) {
  if (quantity < 1) return;
  const result = await updateItemQuantity(item.id!, quantity);
  if (!result.success) showError(result.error.message);
}

async function handleDelete(item: ChecklistItem) {
  const result = await deleteItem(item.id!);
  if (result.success) showInfo(`Removed ${item.name}`, 3000);
  else showError(result.error.message);
}

async function handleCategoryToggle(categoryId: number, checked: boolean) {
  const result = await updateCategoryChecked(categoryId, checked);
  if (!result.success) showError(result.error.message);
}
</script>
