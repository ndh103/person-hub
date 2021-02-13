<template>
  <component v-bind:is="componentFile"></component>
</template>

<script lang="ts">
import Vue from "vue"

const Component = Vue.extend({
  props: {
    customClass: String,
    icon: String,
  },
  computed: {
    componentFile: function () {
      return () => import(`../assets/${this.icon}?inline`)
    },
  },
  updated: function () {
    if (this.customClass) {
      const classes = this.customClass.split(" ")
      this.$el.classList.add(...classes)
    }
  },
})

export default Component
</script>