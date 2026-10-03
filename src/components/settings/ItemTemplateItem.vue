<template>
  <div class="bg-white p-3 rounded-lg border border-gray-200">
    <div class="flex items-start gap-3">
      <!-- Toggle Switch -->
      <button
        class="relative mt-0.5 inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500"
        :class="item.enabled ? 'bg-indigo-600' : 'bg-gray-200'"
        role="switch"
        :aria-checked="item.enabled"
        :aria-label="`Include ${item.name}`"
        @click="$emit('toggle', item.id!)"
      >
        <span
          class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          :class="item.enabled ? 'translate-x-4' : 'translate-x-0'"
        />
      </button>

      <!-- Display -->
      <div v-if="!isEditing" class="flex-1 min-w-0">
        <div class="flex flex-wrap items-baseline gap-x-2">
          <span class="font-medium text-gray-900 text-sm">{{ item.name }}</span>
          <span v-if="!item.enabled" class="text-xs text-gray-500">(Disabled)</span>
        </div>
        <p class="text-xs text-gray-500">
          {{ ruleSummary }}
          <template v-if="item.phase !== 'ahead'"> · {{ PACK_PHASE_LABELS[item.phase] }}</template>
        </p>
        <div v-if="item.tags.length" class="mt-1 flex flex-wrap gap-1">
          <span
            v-for="tag in item.tags"
            :key="tag"
            class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
          >
            {{ TRIP_TAG_LABELS[tag] }}
          </span>
        </div>
      </div>

      <!-- Edit Form -->
      <form v-else class="flex-1 min-w-0 space-y-4" novalidate @submit.prevent="saveEdit">
        <div>
          <label :for="`${uid}-name`" class="block text-xs font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            :id="`${uid}-name`"
            v-model="draft.name"
            type="text"
            class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
            placeholder="Item name"
          />
        </div>

        <fieldset>
          <legend class="text-xs font-medium text-gray-700 mb-1">
            Only for trips with
            <span class="font-normal text-gray-500">(none = always included)</span>
          </legend>
          <div class="flex flex-wrap gap-1.5">
            <ChipToggle
              v-for="tag in TRIP_TAGS"
              :key="tag"
              size="sm"
              :selected="draft.tags.includes(tag)"
              @toggle="toggleTag(tag)"
            >
              {{ TRIP_TAG_LABELS[tag] }}
            </ChipToggle>
          </div>
        </fieldset>

        <fieldset class="space-y-2">
          <legend class="text-xs font-medium text-gray-700 mb-1">Quantity</legend>
          <select
            v-model="draft.kind"
            aria-label="Quantity rule"
            class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="fixed">Fixed number</option>
            <option value="per_day">Per day</option>
            <option value="per_n_days">One every N days</option>
          </select>

          <div v-if="draft.kind === 'fixed'" class="flex items-center gap-2 text-sm">
            <label :for="`${uid}-count`" class="text-gray-600">Count</label>
            <input
              :id="`${uid}-count`"
              v-model.number="draft.count"
              type="number"
              min="1"
              step="1"
              :class="numberInputClass"
            />
          </div>

          <template v-else>
            <div v-if="draft.kind === 'per_day'" class="flex flex-wrap items-center gap-2 text-sm">
              <input
                :id="`${uid}-rate`"
                v-model.number="draft.rate"
                type="number"
                min="0.1"
                step="0.1"
                aria-label="Number per day"
                :class="numberInputClass"
              />
              <label :for="`${uid}-rate`" class="text-gray-600">per day</label>
              <label class="ml-2 flex items-center gap-1.5 text-gray-600">
                <input
                  v-model="draft.spare"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                + one per spare day
              </label>
            </div>
            <div v-else class="flex items-center gap-2 text-sm">
              <label :for="`${uid}-n`" class="text-gray-600">One every</label>
              <input
                :id="`${uid}-n`"
                v-model.number="draft.n"
                type="number"
                min="1"
                step="1"
                :class="numberInputClass"
              />
              <span class="text-gray-600">days</span>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <label :for="`${uid}-min`" class="text-gray-600">Min</label>
              <input
                :id="`${uid}-min`"
                v-model.number="draft.min"
                type="number"
                min="1"
                step="1"
                placeholder="–"
                :class="numberInputClass"
              />
              <label :for="`${uid}-max`" class="ml-2 text-gray-600">Max</label>
              <input
                :id="`${uid}-max`"
                v-model.number="draft.max"
                type="number"
                min="1"
                step="1"
                placeholder="–"
                :class="numberInputClass"
              />
              <span class="text-xs text-gray-500">(optional)</span>
            </div>
          </template>
          <p class="text-xs text-gray-500">
            Per-day counts use the trip length, or the washing interval if shorter.
          </p>
        </fieldset>

        <div>
          <label :for="`${uid}-phase`" class="block text-xs font-medium text-gray-700 mb-1">
            When to pack
          </label>
          <select
            :id="`${uid}-phase`"
            v-model="draft.phase"
            class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option v-for="phase in PACK_PHASES" :key="phase" :value="phase">
              {{ PACK_PHASE_LABELS[phase] }}
            </option>
          </select>
        </div>

        <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>

        <div class="flex gap-2">
          <button
            type="submit"
            class="min-h-[40px] flex-1 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Save
          </button>
          <button
            type="button"
            class="min-h-[40px] rounded-lg border border-gray-300 px-4 text-sm hover:bg-gray-50"
            @click="cancelEdit"
          >
            Cancel
          </button>
        </div>
      </form>

      <!-- Action Buttons -->
      <div v-if="!isEditing" class="flex gap-1 flex-shrink-0">
        <button
          class="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Edit item"
          @click="startEdit"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
        <button
          class="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete item"
          @click="$emit('delete', item.id!)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import ChipToggle from '@/components/common/ChipToggle.vue';
import { describeQuantityRule } from '@/composables/usePerDayCalculator';
import { PACK_PHASES, PACK_PHASE_LABELS, TRIP_TAGS, TRIP_TAG_LABELS } from '@/types';
import type { ItemTemplate, PackPhase, QuantityRule, TripTag } from '@/types';

type ItemUpdates = Partial<Pick<ItemTemplate, 'name' | 'tags' | 'quantity' | 'phase'>>;
/** Number inputs bound with v-model.number yield '' when empty */
type NumberField = number | '';

const props = defineProps<{
  item: ItemTemplate;
}>();

const emit = defineEmits<{
  update: [itemId: number, updates: ItemUpdates];
  delete: [itemId: number];
  toggle: [itemId: number];
}>();

const uid = useId();
const numberInputClass =
  'w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500';

const isEditing = ref(false);
const error = ref('');
const draft = ref(createDraft());

// Clear a validation message as soon as the user changes something
watch(draft, () => (error.value = ''), { deep: true });

const ruleSummary = computed(() => {
  const rule = props.item.quantity;
  return rule.kind === 'fixed' ? `×${rule.count}` : describeQuantityRule(rule);
});

function createDraft() {
  const rule = props.item.quantity;
  return {
    name: props.item.name,
    tags: [...props.item.tags] as TripTag[],
    phase: props.item.phase as PackPhase,
    kind: rule.kind as QuantityRule['kind'],
    // Each kind keeps its own fields so switching kinds back and forth doesn't lose values
    count: (rule.kind === 'fixed' ? rule.count : 1) as NumberField,
    rate: (rule.kind === 'per_day' ? rule.rate : 1) as NumberField,
    spare: rule.kind === 'per_day' ? rule.spare : true,
    n: (rule.kind === 'per_n_days' ? rule.n : 3) as NumberField,
    min: (rule.kind !== 'fixed' ? (rule.min ?? '') : '') as NumberField,
    max: (rule.kind !== 'fixed' ? (rule.max ?? '') : '') as NumberField,
  };
}

function startEdit() {
  draft.value = createDraft();
  error.value = '';
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
  error.value = '';
}

function toggleTag(tag: TripTag) {
  const tags = draft.value.tags;
  const index = tags.indexOf(tag);
  if (index === -1) tags.push(tag);
  else tags.splice(index, 1);
}

function isPositiveInteger(value: NumberField): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/** Build the quantity rule from the draft, or return an error message */
function buildRule(): QuantityRule | string {
  const d = draft.value;
  if (d.kind === 'fixed') {
    return isPositiveInteger(d.count)
      ? { kind: 'fixed', count: d.count }
      : 'Count must be a whole number of at least 1';
  }

  if (d.min !== '' && !isPositiveInteger(d.min)) return 'Min must be a whole number of at least 1';
  if (d.max !== '' && !isPositiveInteger(d.max)) return 'Max must be a whole number of at least 1';
  if (d.min !== '' && d.max !== '' && d.min > d.max) return 'Min cannot be more than max';
  const caps = {
    ...(d.min !== '' && { min: d.min }),
    ...(d.max !== '' && { max: d.max }),
  };

  if (d.kind === 'per_day') {
    if (typeof d.rate !== 'number' || !(d.rate > 0)) return 'Per-day amount must be more than 0';
    return { kind: 'per_day', rate: d.rate, spare: d.spare, ...caps };
  }
  if (!isPositiveInteger(d.n)) return 'Days must be a whole number of at least 1';
  return { kind: 'per_n_days', n: d.n, ...caps };
}

function saveEdit() {
  const name = draft.value.name.trim();
  if (!name) {
    error.value = 'Name is required';
    return;
  }
  const rule = buildRule();
  if (typeof rule === 'string') {
    error.value = rule;
    return;
  }

  // Keep tags in the canonical order
  const tags = TRIP_TAGS.filter((t) => draft.value.tags.includes(t));
  emit('update', props.item.id!, { name, tags, quantity: rule, phase: draft.value.phase });
  isEditing.value = false;
}
</script>
