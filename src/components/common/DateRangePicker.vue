<template>
  <div class="w-full">
    <label :for="id" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <VueDatePicker
      :model-value="range"
      class="date-range-picker"
      :class="{ 'date-range-picker--error': error }"
      :range="{ partialRange: false }"
      auto-apply
      :week-start="1"
      :multi-calendars="isWide ? 2 : undefined"
      :time-config="{ enableTimePicker: false }"
      :formats="{ input: formatRange }"
      :input-attrs="{ id, required, clearable: false }"
      placeholder="Select start and end dates"
      teleport
      @update:model-value="onSelect"
    />
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-sm text-gray-500">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { format, isSameYear, parseISO } from 'date-fns';

interface Props {
  id: string;
  label: string;
  start: string; // yyyy-MM-dd
  end: string; // yyyy-MM-dd
  required?: boolean;
  error?: string;
  hint?: string;
}

const props = withDefaults(defineProps<Props>(), { required: false, error: '', hint: '' });
const emit = defineEmits<{ 'update:start': [value: string]; 'update:end': [value: string] }>();

// The picker works with Date objects; the form stores local 'yyyy-MM-dd' strings
const range = computed(() =>
  props.start && props.end ? [parseISO(props.start), parseISO(props.end)] : null
);

// Only complete ranges are emitted; a half-picked range stays inside the picker
function onSelect(value: unknown) {
  if (Array.isArray(value) && value[0] instanceof Date && value[1] instanceof Date) {
    emit('update:start', format(value[0], 'yyyy-MM-dd'));
    emit('update:end', format(value[1], 'yyyy-MM-dd'));
  }
}

function formatRange(dates: Date | Date[]): string {
  const [start, end] = Array.isArray(dates) ? dates : [dates];
  if (!start) return '';
  if (!end) return format(start, 'EEE, MMM d, yyyy');
  const startFormat = isSameYear(start, end) ? 'EEE, MMM d' : 'EEE, MMM d, yyyy';
  return `${format(start, startFormat)} – ${format(end, 'EEE, MMM d, yyyy')}`;
}

// Show two months side by side when there's room
const wideQuery = window.matchMedia('(min-width: 640px)');
const isWide = ref(wideQuery.matches);
const onWideChange = (e: MediaQueryListEvent) => (isWide.value = e.matches);
onMounted(() => wideQuery.addEventListener('change', onWideChange));
onBeforeUnmount(() => wideQuery.removeEventListener('change', onWideChange));
</script>

<style>
/* Match the app's Tailwind look (blue-600, rounded-lg, gray borders).
   :root raises specificity above the library's own .dp--theme-light variables. */
:root .dp--theme-light {
  --dp-font-family: inherit;
  --dp-border-radius: 0.5rem;
  --dp-cell-border-radius: 0.5rem;
  --dp-cell-size: 40px;
  --dp-input-padding: 10px 12px;
  --dp-primary-color: #2563eb;
  --dp-primary-disabled-color: #93c5fd;
  --dp-border-color: #d1d5db;
  --dp-border-color-hover: #9ca3af;
  --dp-border-color-focus: #3b82f6;
  --dp-highlight-color: #2563eb1a;
  --dp-range-between-dates-background-color: #dbeafe;
  --dp-range-between-dates-text-color: #1e3a8a;
  --dp-range-between-border-color: #dbeafe;
}

.date-range-picker .dp--input {
  min-height: 44px;
}

.date-range-picker .dp--input-focus {
  box-shadow: 0 0 0 2px #3b82f6;
  border-color: transparent;
}

.date-range-picker--error .dp--input {
  border-color: #ef4444;
}
</style>
