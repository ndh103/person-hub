<script setup lang="ts">
  import { computed } from '@vue/reactivity'
  import { defineProps, defineEmits } from 'vue'

  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false,
    },
    onTitle: {
      type: String,
      default: '',
    },
    offTitle: {
      type: String,
      default: '',
    },
  })

  const emit = defineEmits<{
    (event: 'update:modelValue', data: boolean)
  }>()

  const inputChecked = computed({
    get() {
      return props.modelValue
    },
    set(val: boolean) {
      emit('update:modelValue', val)
    },
  })
</script>

<template>
  <div>
    <div class="content-center relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
      <input id="toggle" v-model="inputChecked" type="checkbox" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" />
      <label for="toggle" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
    </div>
    <label for="toggle" class="text-sm text-gray-700">{{ modelValue ? onTitle : offTitle }}</label>
  </div>
</template>

<style scoped lang="postcss">
  .toggle-checkbox:checked {
    @apply right-0 border-emerald-400;
  }
  .toggle-checkbox:checked + .toggle-label {
    @apply bg-emerald-400;
  }
</style>
