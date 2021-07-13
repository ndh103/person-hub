<template>
  <component v-bind:is="componentFile"></component>
</template>

<script lang="ts">
import Vue from "vue"

const SvgImage =  Vue.extend({
  props: {
    icon: String,
  },
  computed: {
    componentFile: function () {
      return () => import(`../assets/${this.icon}?inline`)
    },
  }
})

export default SvgImage;

</script>