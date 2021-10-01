<template>
  <div
    id="overlay"
    class="
      items-center
      justify-center
      flex-row
      fixed
      flex
      w-full
      h-full
      top-0
      left-0
      right-0
      bottom-0
      bg-gray-300 bg-opacity-50
      z-10
      cursor-pointer
    "
    :class="[applicationStoreService.state.isLoading ? 'block' : 'hidden']"
  >
    <div
      class="
        loader
        ease-linear
        rounded-full
        border-8 border-t-8 border-white
        h-16
        w-16
      "
    ></div>
  </div>
</template>
<script lang="ts">
  import { defineComponent } from 'vue'
  import applicationStoreService from '@/store/application/applicationStoreService'

  export default defineComponent({
    computed: {
      applicationStoreService() {
        return applicationStoreService
      },
    },
  })
</script>

<style lang="postcss" scoped>
  .loader {
    border-top-color: #10b981;
    -webkit-animation: spinner 1.5s linear infinite;
    animation: spinner 1.5s linear infinite;
  }

  @-webkit-keyframes spinner {
    0% {
      -webkit-transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
    }
  }

  @keyframes spinner {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
