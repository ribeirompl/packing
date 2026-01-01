<template>
  <div class="flex items-start min-h-[44px]">
    <div class="flex items-center h-5 mt-2.5">
      <input
        :id="id"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        @change="onChange"
        class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      />
    </div>
    <div v-if="label || $slots.default" class="ml-3 text-sm flex-1">
      <label :for="id" class="font-medium text-gray-700 cursor-pointer block leading-relaxed">
        <slot>{{ label }}</slot>
      </label>
      <p v-if="description" class="text-gray-500 mt-1">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  id?: string;
  modelValue: boolean;
  label?: string;
  description?: string;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

function onChange(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.checked);
}
</script>
