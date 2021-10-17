<template>
  <div>
    <div class="content-center relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
      <input id="toggle" v-model="inputChecked" type="checkbox" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" />
      <label for="toggle" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
    </div>
    <label for="toggle" class="text-sm text-gray-700">{{ modelValue ? onTitle : offTitle }}</label>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'

  export default defineComponent({
    props: {
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
    },
    emits: ['update:modelValue'],
    computed: {
      inputChecked: {
        get() {
          return this.modelValue
        },
        set(val) {
          this.$emit('update:modelValue', val)
        },
      },
    },
  })
</script>

<style scoped lang="postcss">
  .toggle-checkbox:checked {
    @apply: right-0 border-green-400;
    right: 0;
    border-color: #68d391;
  }
  .toggle-checkbox:checked + .toggle-label {
    @apply: bg-green-400;
    background-color: #68d391;
  }
</style>
