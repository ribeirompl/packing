<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-2xl mx-auto">
      <div class="flex items-center justify-between mb-2">
        <h1 class="text-3xl font-bold text-gray-900">Plan Your Trip</h1>
        <button
          class="text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-4"
          @click="router.push('/settings')"
        >
          Settings
        </button>
      </div>
      <p class="text-gray-600 mb-6">Answer a few questions to generate your packing checklist</p>

      <div
        v-if="hasExistingChecklist"
        class="mb-6 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
      >
        <p class="text-sm text-blue-800">You have a checklist in progress.</p>
        <button
          type="button"
          class="min-h-[44px] px-3 text-sm font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
          @click="router.push('/checklist')"
        >
          View checklist →
        </button>
      </div>

      <form class="bg-white rounded-lg shadow-md p-6 space-y-8" @submit.prevent="handleSubmit">
        <!-- Trip Dates -->
        <section class="space-y-2">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BaseInput
              id="start-date"
              v-model="form.start_date"
              type="date"
              label="Start Date"
              required
              :error="errors.start_date"
            />
            <BaseInput
              id="end-date"
              v-model="form.end_date"
              type="date"
              label="End Date"
              required
              :error="errors.end_date"
            />
          </div>
          <p v-if="tripDays > 0" class="text-sm text-gray-500">
            {{ tripDays }}-day trip (start and end days included)
          </p>
        </section>

        <!-- Transport -->
        <section class="space-y-3">
          <h3 class="font-medium text-gray-900">How are you getting there?</h3>
          <div role="radiogroup" aria-label="Transport" class="grid grid-cols-3 gap-2">
            <ChipToggle
              v-for="option in transportOptions"
              :key="option.value"
              role="radio"
              :selected="form.transport === option.value"
              @toggle="form.transport = option.value"
            >
              {{ option.label }}
            </ChipToggle>
          </div>
          <BaseCheckbox
            id="international"
            v-model="form.international"
            label="Leaving the country"
            description="Adds passport, travel adapter and similar items"
          />
        </section>

        <!-- Weather -->
        <section class="space-y-3">
          <h3 class="font-medium text-gray-900">
            Weather <span class="text-sm font-normal text-gray-500">(pick any)</span>
          </h3>
          <div class="flex flex-wrap gap-2">
            <ChipToggle
              v-for="option in weatherOptions"
              :key="option.tag"
              :selected="form.tags.includes(option.tag)"
              @toggle="toggleTag(option.tag)"
            >
              {{ option.label }}
            </ChipToggle>
          </div>
        </section>

        <!-- Activities -->
        <section class="space-y-3">
          <h3 class="font-medium text-gray-900">
            Activities <span class="text-sm font-normal text-gray-500">(pick any)</span>
          </h3>
          <div class="flex flex-wrap gap-2">
            <ChipToggle
              v-for="tag in activityTags"
              :key="tag"
              :selected="form.tags.includes(tag)"
              @toggle="toggleTag(tag)"
            >
              {{ TRIP_TAG_LABELS[tag] }}
            </ChipToggle>
          </div>
        </section>

        <!-- Laundry & spare days -->
        <section class="space-y-4">
          <BaseCheckbox
            id="washing-machine"
            v-model="form.washing_machine_available"
            label="Washing machine available"
            description="Pack fewer clothes and wash during the trip"
          />

          <div v-if="form.washing_machine_available" class="pl-7">
            <BaseInput
              id="wash-every"
              v-model="form.max_days_before_washing"
              type="number"
              label="Wash every N days"
              hint="Clothes are packed to last this many days (1–14)"
              :min="1"
              :max="14"
              :error="errors.max_days_before_washing"
            />
          </div>

          <div
            v-if="showLaundryHint"
            class="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
            role="note"
          >
            <svg
              class="h-5 w-5 flex-shrink-0 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
            <p>
              That's a {{ tripDays }}-day trip. Consider doing laundry once along the way: tick
              <strong>Washing machine available</strong> to pack about half as many clothes.
            </p>
          </div>

          <div>
            <BaseInput
              id="spare-days"
              v-model="form.spare_days"
              type="number"
              label="Spare days"
              hint="Extra underwear, socks and tops in case of delays or spills"
              :min="0"
              :error="errors.spare_days"
              @update:model-value="spareDaysEdited = true"
            />
            <button
              v-if="spareDaysEdited && autoSpareDays !== null && form.spare_days !== autoSpareDays"
              type="button"
              class="mt-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              @click="resetSpareDays"
            >
              Use suggested ({{ autoSpareDays }})
            </button>
          </div>
        </section>

        <!-- Categories -->
        <section class="space-y-3">
          <h3 class="font-medium text-gray-900">
            Categories to include
            <span class="text-red-500">*</span>
          </h3>
          <p v-if="errors.selected_categories" class="text-sm text-red-600">
            {{ errors.selected_categories }}
          </p>
          <div v-if="categoriesLoading" class="text-gray-500">Loading categories...</div>
          <div v-else class="flex flex-wrap gap-2">
            <ChipToggle
              v-for="category in categories"
              :key="category.id"
              :selected="!!form.selected_categories_map[category.id!]"
              @toggle="
                form.selected_categories_map[category.id!] =
                  !form.selected_categories_map[category.id!]
              "
            >
              {{ category.name }}
            </ChipToggle>
          </div>
        </section>

        <!-- Submit -->
        <div class="space-y-3">
          <p
            v-if="submitError"
            class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            Couldn't generate the checklist: {{ submitError }}
          </p>
          <div class="flex justify-end">
            <BaseButton type="submit" variant="primary" :disabled="isSubmitting" size="lg">
              {{ isSubmitting ? 'Generating...' : 'Generate Checklist' }}
            </BaseButton>
          </div>
        </div>
      </form>
    </div>

    <BaseModal
      :is-open="showReplaceConfirm"
      title="Replace current checklist?"
      @close="showReplaceConfirm = false"
    >
      <p class="text-sm text-gray-500">
        You already have a checklist. Generating a new one will replace it, including what you've
        packed so far and any items you added.
      </p>
      <template #footer>
        <BaseButton variant="outline" @click="showReplaceConfirm = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="confirmReplace">Replace</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { addDays, format as formatDate } from 'date-fns';
import BaseInput from '@/components/common/BaseInput.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseCheckbox from '@/components/common/BaseCheckbox.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ChipToggle from '@/components/common/ChipToggle.vue';
import { useChecklist } from '@/composables/useChecklist';
import { useCategoryManager } from '@/composables/useCategoryManager';
import { usePerDayCalculator, LAUNDRY_HINT_DAYS } from '@/composables/usePerDayCalculator';
import { PreferenceService } from '@/services/PreferenceService';
import { TRIP_TAG_LABELS } from '@/types';
import type { QuestionnaireInput, Category, Preference, TripTag } from '@/types';

type Transport = 'fly' | 'drive' | 'other';

const transportOptions: { value: Transport; label: string }[] = [
  { value: 'fly', label: 'Fly' },
  { value: 'drive', label: 'Drive' },
  { value: 'other', label: 'Other' },
];
const transportTags: Record<Transport, TripTag | null> = {
  fly: 'flying',
  drive: 'road_trip',
  other: null,
};
const weatherOptions: { tag: TripTag; label: string }[] = [
  { tag: 'hot', label: 'Hot' },
  { tag: 'cold', label: 'Cold' },
  { tag: 'rain', label: 'Rain' },
];
const activityTags: TripTag[] = ['beach', 'formal', 'hiking', 'work', 'kids'];

const router = useRouter();
const { generateChecklist, getCurrentChecklist } = useChecklist();
const { getAllCategories } = useCategoryManager();
const calculator = usePerDayCalculator();
const preferenceService = new PreferenceService();

// Pre-populate dates: tomorrow and 6 days later
const tomorrow = addDays(new Date(), 1);
const endDate = addDays(tomorrow, 6);

const categories = ref<Category[]>([]);
const categoriesLoading = ref(true);
const preferences = ref<Preference | null>(null);
const hasExistingChecklist = ref(false);
const isSubmitting = ref(false);
const submitError = ref('');
const showReplaceConfirm = ref(false);
const spareDaysEdited = ref(false);

const form = reactive({
  start_date: formatDate(tomorrow, 'yyyy-MM-dd'),
  end_date: formatDate(endDate, 'yyyy-MM-dd'),
  transport: 'other' as Transport,
  international: false,
  /** Weather and activity tags (transport and international are added on submit) */
  tags: [] as TripTag[],
  washing_machine_available: false,
  max_days_before_washing: 5,
  spare_days: 1,
  selected_categories_map: {} as Record<number, boolean>,
});

const errors = reactive({
  start_date: '',
  end_date: '',
  spare_days: '',
  max_days_before_washing: '',
  selected_categories: '',
});

const selectedCategories = computed(() =>
  categories.value.map((c) => c.id!).filter((id) => form.selected_categories_map[id])
);

const tripDays = computed(() => {
  if (!form.start_date || !form.end_date || form.start_date > form.end_date) return 0;
  return calculator.calculateTripDuration(form.start_date, form.end_date);
});

const autoSpareDays = computed(() => {
  if (!preferences.value || tripDays.value === 0) return null;
  return calculator.calculateAutoSpareDays(
    tripDays.value,
    preferences.value.buffer_days_ratio,
    preferences.value.min_buffer_days
  );
});

const showLaundryHint = computed(
  () => !form.washing_machine_available && tripDays.value > LAUNDRY_HINT_DAYS
);

// Keep spare days in step with the trip length until the user sets them by hand
watch(autoSpareDays, (value) => {
  if (value !== null && !spareDaysEdited.value) form.spare_days = value;
});

onMounted(async () => {
  const [categoriesResult, prefResult, checklistResult] = await Promise.all([
    getAllCategories(),
    preferenceService.getPreferences(),
    getCurrentChecklist(),
  ]);

  hasExistingChecklist.value = checklistResult.success && checklistResult.data !== null;

  if (prefResult.success) {
    preferences.value = prefResult.data;
  }

  if (categoriesResult.success) {
    categories.value = categoriesResult.data;
    categories.value.forEach((cat) => {
      form.selected_categories_map[cat.id!] =
        preferences.value?.category_defaults[cat.id!] ?? cat.default_included;
    });
  }
  categoriesLoading.value = false;
});

function toggleTag(tag: TripTag) {
  const index = form.tags.indexOf(tag);
  if (index === -1) form.tags.push(tag);
  else form.tags.splice(index, 1);
}

function resetSpareDays() {
  if (autoSpareDays.value === null) return;
  form.spare_days = autoSpareDays.value;
  spareDaysEdited.value = false;
}

function validateForm(): boolean {
  let isValid = true;

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
    errors.end_date = 'End date must be on or after the start date';
    isValid = false;
  }

  if (!Number.isInteger(form.spare_days) || form.spare_days < 0) {
    errors.spare_days = 'Spare days must be a whole number, 0 or more';
    isValid = false;
  }

  if (form.washing_machine_available) {
    const days = form.max_days_before_washing;
    if (!Number.isInteger(days) || days < 1 || days > 14) {
      errors.max_days_before_washing = 'Must be a whole number between 1 and 14';
      isValid = false;
    }
  }

  if (selectedCategories.value.length === 0) {
    errors.selected_categories = 'Please select at least one category';
    isValid = false;
  }

  return isValid;
}

function buildTags(): TripTag[] {
  const tags = [...form.tags];
  const transportTag = transportTags[form.transport];
  if (transportTag) tags.unshift(transportTag);
  if (form.international) tags.push('international');
  return tags;
}

function handleSubmit() {
  submitError.value = '';
  if (!validateForm()) return;

  if (hasExistingChecklist.value) {
    showReplaceConfirm.value = true;
  } else {
    void generate();
  }
}

function confirmReplace() {
  showReplaceConfirm.value = false;
  void generate();
}

async function generate() {
  isSubmitting.value = true;

  const input: QuestionnaireInput = {
    start_date: form.start_date,
    end_date: form.end_date,
    spare_days: form.spare_days,
    tags: buildTags(),
    washing_machine_available: form.washing_machine_available,
    max_days_before_washing: form.washing_machine_available
      ? form.max_days_before_washing
      : undefined,
    selected_categories: selectedCategories.value,
  };

  const result = await generateChecklist(input);
  isSubmitting.value = false;

  if (result.success) {
    router.push('/checklist');
  } else {
    submitError.value = result.error.message;
  }
}
</script>
