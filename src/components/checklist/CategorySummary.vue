<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <label class="flex min-h-[44px] flex-1 cursor-pointer items-center gap-3">
        <input
          :id="`category-${categoryId}`"
          ref="checkboxRef"
          type="checkbox"
          :checked="allChecked"
          class="h-5 w-5 cursor-pointer rounded border-gray-300 bg-white text-blue-600 focus:ring-2 focus:ring-blue-500"
          :aria-label="`Mark all ${categoryName} as packed`"
          @change="handleToggle"
        />
        <span class="text-lg font-bold text-gray-900">{{ categoryName }}</span>
      </label>
      <span class="text-sm text-gray-600">{{ checkedCount }}/{{ totalItems }}</span>
    </div>
    <div class="h-1.5 w-full rounded-full bg-gray-200">
      <div
        class="h-1.5 rounded-full bg-blue-600 transition-all"
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
