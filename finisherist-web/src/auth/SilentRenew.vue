<template>
  <div></div>
</template>

<script lang="ts">
import Vue from "vue"
import authService from "./authService"

const Component = Vue.extend({
  mounted() {
    authService.signinSilentCallback();
  }
})

export default Component
</script>