<template>
  <div
    id="overlay"
    class="items-center justify-center flex-row fixed flex w-full h-full top-0 left-0 right-0 bottom-0 bg-gray-300 bg-opacity-50 z-10 cursor-pointer"
    :class="[isShow ? 'block' : 'hidden']"
  >
    <div class="border-0 rounded-lg shadow-lg relative flex flex-col bg-white outline-none focus:outline-none max-w-xl">
      <!--header-->
      <div class="flex items-start justify-between px-5 py-3 border-b border-solid border-gray-200 rounded-t">
        <p class="text-lg font-semibold">{{ title }}</p>
        <CloseIcon class="w-4 h-4 inline-block text-gray-300 cursor-pointer hover:text-gray-400" @click="isShow = false" />
      </div>
      <!--body-->
      <div class="relative p-6 flex-auto">
        <slot name="body"> default body </slot>
      </div>
      <!--footer-->
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import CloseIcon from '@/assets/close-icon.svg?component'

  export default defineComponent({
    components: {
      CloseIcon,
    },
    props: {
      title: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        isShow: false,
      }
    },
    methods: {
      toggleModal(isShow) {
        this.isShow = isShow
      },
    },
  })
</script>

<style lang="postcss" scoped></style>
