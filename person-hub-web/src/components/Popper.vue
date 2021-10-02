<template>
  <div :class="[isShow ? 'block' : 'hidden']" class="popper-container">
    <slot name="body"> </slot>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import { createPopper, Placement, Instance } from '@popperjs/core'

  export default defineComponent({
    props: {
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
    },
    data() {
      return {
        isShow: false,
        popperInstance: null as Instance,
      }
    },
    methods: {
      async togglePopper(isShow) {
        this.isShow = isShow

        if (isShow) {
          const reference = document.querySelector(this.triggerElementSelector)
          const popper = document.querySelector(
            this.popperElementSelector
          ) as HTMLElement

          this.popperInstance = createPopper(reference, popper, {
            placement: this.placement as Placement,
          })

          // Wait until the original click event has already going though the document
          // Then register the click on document to handle close the Popper when clicking outside
          setTimeout(() => {
            const clicker = (event) => {
              this.isShow = false
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
      },
    },
  })
</script>

<style lang="postcss" scoped></style>
