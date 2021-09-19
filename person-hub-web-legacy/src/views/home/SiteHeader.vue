<template>
  <header class="bg-red-600 text-white h-10 flex justify-between fixed w-full p-1 antialiased font-light text-xl">
    <div class="pl-4">
      <span @click="toggleSideBar()">
        <svg-image class="inline-block h-7 w-7 lg:hidden" icon="menu-icon.svg"></svg-image>
      </span>
      Person Hub
    </div>
    <div class="pr-5 cursor-pointer">
      <img :src="$auth.user.picture" class="h-7 w-7 inline-block mr-3" />

      <button @click="logout()" class="text-xs">Logout</button>
    </div>
  </header>
</template>

<script lang="ts">
import Vue from "vue"
import SvgImage from "@/components/SvgImage.vue"
import { mapMutations } from "vuex"
import applicationStoreConstant from "@/store/application/application-store-constant"

export default Vue.extend({
  components: {
    SvgImage,
  },
  methods: {
    ...mapMutations("application", {
      toggleSideBar: applicationStoreConstant.MUTATIONS.toogleSidebar,
    }),
    logout: function () {
      this.$auth.logout()
    },
  },
})
</script>

<style lang="postcss" scoped>
</style>