<script setup lang="ts">
  import { defineProps, ref } from 'vue'
  import { createPopper, Placement, Instance } from '@popperjs/core'

  const props = defineProps({
    title: {
      type: String,
      default: '',
    },
    triggerElementSelector: {
      type: String,
      default: '',
    },
    popperElementSelector: {
      type: String,
      default: '',
    },
    placement: {
      type: String,
      default: 'right',
    },
  })

  const state = ref({
    isShow: false,
    popperInstance: null as Instance,
  })

  async function togglePopper(isShow) {
    state.value.isShow = isShow

    if (isShow) {
      const reference = document.querySelector(props.triggerElementSelector)
      const popper = document.querySelector(props.popperElementSelector) as HTMLElement

      state.value.popperInstance = createPopper(reference, popper, {
        placement: props.placement as Placement,
      })

      // Wait until the original click event has already going though the document
      // Then register the click on document to handle close the Popper when clicking outside
      setTimeout(() => {
        const clicker = (event) => {
          state.value.isShow = false
        }
        document.addEventListener('click', clicker, {
          once: true,
        })

        //TODO: should test if the behavior work for mobile
        // document.addEventListener('touchstart', clicker, {
        //   once: true,
        // })
      }, 100)
    }
  }

  defineExpose({
    togglePopper,
  })
</script>

<template>
  <div :class="[state.isShow ? 'block' : 'hidden']" class="popper-container">
    <slot name="body"> </slot>
  </div>
</template>

<style lang="postcss" scoped></style>
