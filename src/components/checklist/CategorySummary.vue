<template>
  <div class="border border-gray-200 rounded-lg p-4">
    <label class="flex items-center mb-2 cursor-pointer">
      <input
        :id="`category-${categoryId}`"
        ref="checkboxRef"
        type="checkbox"
        :checked="allChecked"
        @change="handleToggle"
        class="touch-target w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
      />
      <span class="ml-3 font-medium text-gray-900">{{ categoryName }}</span>
    </label>
    <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
      <span>{{ checkedCount }} / {{ totalItems }}</span>
      <span class="font-medium">{{ percentage }}%</span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2">
      <div
        class="bg-blue-600 h-2 rounded-full transition-all"
        :style="{ width: percentage + '%' }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  categoryId: number;
  categoryName: string;
  totalItems: number;
  checkedCount: number;
}>();

const emit = defineEmits<{
  (e: 'toggleCategory', categoryId: number, checked: boolean): void;
}>();

const checkboxRef = ref<HTMLInputElement | null>(null);

const allChecked = computed(() => props.checkedCount === props.totalItems && props.totalItems > 0);
const noneChecked = computed(() => props.checkedCount === 0);
const indeterminate = computed(
  () => !allChecked.value && !noneChecked.value && props.totalItems > 0
);
const percentage = computed(() =>
  props.totalItems > 0 ? Math.round((props.checkedCount / props.totalItems) * 100) : 0
);

// Update indeterminate state on checkbox element
watch(
  indeterminate,
  (isIndeterminate) => {
    if (checkboxRef.value) {
      checkboxRef.value.indeterminate = isIndeterminate;
    }
  },
  { immediate: true }
);

function handleToggle() {
  // Simple toggle: if not all checked, check all. If all checked, uncheck all.
  // Indeterminate state automatically shows when some are checked
  const targetState = !allChecked.value;
  emit('toggleCategory', props.categoryId, targetState);
}
</script>
