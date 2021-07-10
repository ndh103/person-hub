<template>
  <div>
    <header class="bg-red-600 text-white h-10 flex justify-between fixed w-full p-1 antialiased font-light text-xl">
      <div class="pl-4">
        <svg-image class="h-7 w-7 inline-block" icon="check-list-icon.svg"></svg-image>
        Person Hub
      </div>
      <div>
        <svg-image class="h-7 w-7 inline-block" icon="user-icon.svg"></svg-image>
        <button @click="logout()">Logout</button>
      </div>
    </header>

    <div class="flex">
      <aside-menu class="flex-none w-80 top-0 pt-10 pl-10 h-screen bg-gray-50"></aside-menu>
      <main class="flex-grow p-4 h-full pt-10">
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue } from "vue-property-decorator"
import SvgImage from "../../components/SvgImage.vue"
import AsideMenu from "./AsideMenu.vue"
import authService from "@/auth/authService"

const Home = Vue.extend({
  components: {
    SvgImage,
    AsideMenu
  },
  props: {
  },
  methods: {
    logout: function () {
      authService.signoutRedirect()
    }
  },
});

export default Home;

</script>
<style lang="postcss" scoped>
</style>>

