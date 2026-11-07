<script setup>
import AppDropdown from './AppDropdown.vue'
const props = defineProps({
  modelValue: { type: String, default: 'Tất cả' },
  label: { type: String, default: 'Đối tượng (nam/nữ)' },
  options: { type: Array, default: () => ['Tất cả', 'Nam', 'Nữ'] }
})
const emit = defineEmits(['update:modelValue'])
</script>
<template>
  <AppDropdown :model-value="modelValue" :label="label" :options="options" placeholder="Chọn đối tượng" @update:model-value="emit('update:modelValue', $event)" />
</template>
