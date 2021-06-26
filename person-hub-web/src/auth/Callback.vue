<template>
  <div></div>
</template>

<script lang="ts">
import Vue from "vue"
import authService from "./authService"

const Component = Vue.extend({
  mounted() {
    authService
      .signinRedirectCallback()
      .then(function () {
        window.location.href = "../"
      })
      .catch(function (err) {
        console.log(err)
      })
  },
})

export default Component
</script>