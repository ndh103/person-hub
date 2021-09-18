<template>
  <component v-bind:is="componentFile"></component>
</template>

<script lang="ts">
import {defineComponent} from "vue"


export default defineComponent({
  props: {
    icon: String,
  },
  computed: {
    componentFile: function () {
      return () => import(`../assets/${this.icon}?inline`)
    },
  }
})

</script>