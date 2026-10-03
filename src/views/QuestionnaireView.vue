<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-2xl mx-auto">
      <div class="flex items-center justify-between mb-2">
        <h1 class="text-3xl font-bold text-gray-900">Plan Your Trip</h1>
        <button
          @click="router.push('/settings')"
          class="text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-4"
        >
          Settings
        </button>
      </div>
      <p class="text-gray-600 mb-8">Answer a few questions to generate your packing checklist</p>

      <form @submit.prevent="handleSubmit" class="bg-white rounded-lg shadow-md p-6 space-y-6">
        <!-- Trip Dates -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BaseInput
            v-model="form.start_date"
            type="date"
            label="Start Date"
            required
            :error="errors.start_date"
            @update:modelValue="onDatesChange"
          />
          <BaseInput
            v-model="form.end_date"
            type="date"
            label="End Date"
            required
            :error="errors.end_date"
            @update:modelValue="onDatesChange"
          />
        </div>

        <!-- Buffer Days -->
        <BaseInput
          v-model="form.buffer_days"
          type="number"
          label="Buffer Days"
          hint="Extra days to pack for (auto-calculated, but you can override)"
          :min="0"
          :error="errors.buffer_days"
        />

        <!-- Washing Machine -->
        <div class="space-y-4">
          <BaseCheckbox
            v-model="form.washing_machine_available"
            label="Washing machine available at destination"
            description="Check this if you'll have access to laundry facilities"
            @update:modelValue="onWashingMachineChange"
          />

          <BaseInput
            v-if="form.washing_machine_available"
            v-model="form.max_days_before_washing"
            type="number"
            label="Max days before washing"
            hint="How many days worth of clothes before doing laundry? (1-14)"
            :min="1"
            :max="14"
            :error="errors.max_days_before_washing"
            @update:modelValue="onDatesChange"
          />
        </div>

        <!-- Trip Type -->
        <div class="space-y-3">
          <h3 class="font-medium text-gray-900">Trip Type</h3>
          <div class="grid grid-cols-1 gap-3">
            <button
              type="button"
              @click="form.formal_attire = !form.formal_attire"
              :class="[
                'min-h-[60px] p-4 rounded-lg border-2 transition-all text-left',
                form.formal_attire
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-gray-400',
              ]"
            >
              <div class="flex items-start gap-3">
                <div class="flex items-center justify-center w-5 h-5 mt-0.5 flex-shrink-0">
                  <div
                    :class="[
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                      form.formal_attire
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300',
                    ]"
                  >
                    <svg
                      v-if="form.formal_attire"
                      class="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div class="flex-1">
                  <div class="font-medium text-gray-900">Formal attire needed</div>
                  <div class="text-sm text-gray-500 mt-1">
                    Business meetings, formal dinners, etc.
                  </div>
                </div>
              </div>
            </button>
            <button
              type="button"
              @click="form.swimming = !form.swimming"
              :class="[
                'min-h-[60px] p-4 rounded-lg border-2 transition-all text-left',
                form.swimming
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-gray-400',
              ]"
            >
              <div class="flex items-start gap-3">
                <div class="flex items-center justify-center w-5 h-5 mt-0.5 flex-shrink-0">
                  <div
                    :class="[
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                      form.swimming ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300',
                    ]"
                  >
                    <svg
                      v-if="form.swimming"
                      class="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div class="flex-1">
                  <div class="font-medium text-gray-900">Swimming/beach activities</div>
                  <div class="text-sm text-gray-500 mt-1">Pool, beach, water sports</div>
                </div>
              </div>
            </button>
            <button
              type="button"
              @click="form.hot_weather = !form.hot_weather"
              :class="[
                'min-h-[60px] p-4 rounded-lg border-2 transition-all text-left',
                form.hot_weather
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-gray-400',
              ]"
            >
              <div class="flex items-start gap-3">
                <div class="flex items-center justify-center w-5 h-5 mt-0.5 flex-shrink-0">
                  <div
                    :class="[
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                      form.hot_weather ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300',
                    ]"
                  >
                    <svg
                      v-if="form.hot_weather"
                      class="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div class="flex-1">
                  <div class="font-medium text-gray-900">Hot weather destination</div>
                  <div class="text-sm text-gray-500 mt-1">Tropical, summer climate</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Categories -->
        <div class="space-y-3">
          <h3 class="font-medium text-gray-900">
            Categories to Include
            <span class="text-red-500">*</span>
          </h3>
          <p v-if="errors.selected_categories" class="text-sm text-red-600">
            {{ errors.selected_categories }}
          </p>
          <div v-if="categoriesLoading" class="text-gray-500">Loading categories...</div>
          <div v-else class="grid grid-cols-1 gap-3">
            <button
              v-for="category in categories"
              :key="category.id"
              type="button"
              @click="
                form.selected_categories_map[category.id!] =
                  !form.selected_categories_map[category.id!]
              "
              :class="[
                'min-h-[60px] p-4 rounded-lg border-2 transition-all text-left',
                form.selected_categories_map[category.id!]
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-gray-400',
              ]"
            >
              <div class="flex items-center gap-3">
                <div class="flex items-center justify-center w-5 h-5 flex-shrink-0">
                  <div
                    :class="[
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                      form.selected_categories_map[category.id!]
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300',
                    ]"
                  >
                    <svg
                      v-if="form.selected_categories_map[category.id!]"
                      class="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div class="font-medium text-gray-900">{{ category.name }}</div>
              </div>
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end">
          <BaseButton type="submit" variant="primary" :disabled="isSubmitting" size="lg">
            {{ isSubmitting ? 'Generating...' : 'Generate Checklist' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { addDays, format as formatDate } from 'date-fns';
import BaseInput from '@/components/common/BaseInput.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseCheckbox from '@/components/common/BaseCheckbox.vue';
import { useChecklist } from '@/composables/useChecklist';
import { useCategoryManager } from '@/composables/useCategoryManager';
import { usePerDayCalculator } from '@/composables/usePerDayCalculator';
import { PreferenceService } from '@/services/PreferenceService';
import type { QuestionnaireInput, Category } from '@/types';

const router = useRouter();
const { generateChecklist } = useChecklist();
const { getAllCategories } = useCategoryManager();
const calculator = usePerDayCalculator();
const preferenceService = new PreferenceService();

// Pre-populate dates: tomorrow and 6 days later
const tomorrow = addDays(new Date(), 1);
const endDate = addDays(tomorrow, 6);

const categories = ref<Category[]>([]);
const categoriesLoading = ref(true);
const isSubmitting = ref(false);

const form = reactive({
  start_date: formatDate(tomorrow, 'yyyy-MM-dd'),
  end_date: formatDate(endDate, 'yyyy-MM-dd'),
  buffer_days: 1,
  formal_attire: false,
  swimming: false,
  hot_weather: false,
  washing_machine_available: false,
  max_days_before_washing: 0 as number,
  selected_categories_map: {} as Record<number, boolean>,
});

const errors = reactive({
  start_date: '',
  end_date: '',
  buffer_days: '',
  max_days_before_washing: '',
  selected_categories: '',
});

const selectedCategories = computed(() => {
  return Object.keys(form.selected_categories_map)
    .filter((key) => form.selected_categories_map[Number(key)])
    .map(Number);
});

onMounted(async () => {
  // Load categories
  const result = await getAllCategories();
  if (result.success) {
    categories.value = result.data;

    // Load preferences and set defaults
    const prefResult = await preferenceService.getPreferences();
    if (prefResult.success) {
      const prefs = prefResult.data;

      // Initialize selected categories from preferences
      categories.value.forEach((cat) => {
        form.selected_categories_map[cat.id!] =
          prefs.category_defaults[cat.id!] ?? cat.default_included;
      });

      // Initialize buffer days ratio for auto-calculation
      form.buffer_days = prefs.min_buffer_days;
    }
  }
  categoriesLoading.value = false;
});

function onDatesChange() {
  if (!form.start_date || !form.end_date) return;

  // Auto-calculate buffer days
  const prefResult = preferenceService.getPreferences();
  prefResult.then((result) => {
    if (result.success) {
      const prefs = result.data;
      form.buffer_days = calculator.calculateAutoBufferDays(
        form.start_date,
        form.end_date,
        form.washing_machine_available,
        form.max_days_before_washing,
        prefs.buffer_days_ratio,
        prefs.min_buffer_days
      );
    }
  });
}

function onWashingMachineChange() {
  if (!form.washing_machine_available) {
    form.max_days_before_washing = 0;
  }
  onDatesChange();
}

function validateForm(): boolean {
  let isValid = true;

  // Reset errors
  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = '';
  });

  if (!form.start_date) {
    errors.start_date = 'Start date is required';
    isValid = false;
  }

  if (!form.end_date) {
    errors.end_date = 'End date is required';
    isValid = false;
  }

  if (form.start_date && form.end_date && form.start_date > form.end_date) {
    errors.end_date = 'End date must be after start date';
    isValid = false;
  }

  if (form.buffer_days < 0) {
    errors.buffer_days = 'Buffer days cannot be negative';
    isValid = false;
  }

  if (form.washing_machine_available && form.max_days_before_washing) {
    if (form.max_days_before_washing < 1 || form.max_days_before_washing > 14) {
      errors.max_days_before_washing = 'Must be between 1 and 14';
      isValid = false;
    }
  }

  if (selectedCategories.value.length === 0) {
    errors.selected_categories = 'Please select at least one category';
    isValid = false;
  }

  return isValid;
}

async function handleSubmit() {
  if (!validateForm()) return;

  isSubmitting.value = true;

  const input: QuestionnaireInput = {
    start_date: form.start_date,
    end_date: form.end_date,
    buffer_days: form.buffer_days,
    formal_attire: form.formal_attire,
    swimming: form.swimming,
    hot_weather: form.hot_weather,
    washing_machine_available: form.washing_machine_available,
    max_days_before_washing:
      form.max_days_before_washing > 0 ? form.max_days_before_washing : undefined,
    selected_categories: selectedCategories.value,
  };

  const result = await generateChecklist(input);

  isSubmitting.value = false;

  if (result.success) {
    router.push('/checklist');
  } else {
    alert('Failed to generate checklist: ' + result.error.message);
  }
}
</script>
