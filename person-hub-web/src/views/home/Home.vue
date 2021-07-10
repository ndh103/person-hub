<template>
  <div>
    <header class="bg-red-600 text-white h-10 flex justify-between fixed w-full p-1 antialiased font-light text-xl">
      <div class="pl-4">
        <span @click="toggleSideBar()">
          <svg-image class="inline-block h-7 w-7 lg:hidden" icon="menu-icon.svg"></svg-image>
        </span>
        Person Hub
      </div>
      <div>
        <svg-image class="h-7 w-7 inline-block" icon="user-icon.svg"></svg-image>
        <button @click="logout()">Logout</button>
      </div>
    </header>

    <div class="flex">
      <div class="hidden" :class="[overlaySideBarStatus + '-sidebar-overlay']"></div>
      <aside-menu class="flex-none w-80 h-screen fixed top-0 left-0 pt-8 pl-8 bg-gray-50 lg:static lg:block" :class="[overlaySideBarStatus + '-sidebar']"></aside-menu>
      <main class="flex-grow p-4 h-full pt-10">
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue } from "vue-property-decorator"
import { mapMutations, mapGetters } from "vuex"
import SvgImage from "@/components/SvgImage.vue"
import AppStoreConstant from "@/store/application/application-store-constant"
import AsideMenu from "./AsideMenu.vue"
import authService from "@/auth/authService"

const Home = Vue.extend({
  components: {
    SvgImage,
    AsideMenu,
  },
  props: {},
  computed: {
    ...mapGetters("application", {
      overlaySideBarStatus: AppStoreConstant.GETTERS.overlaySideBarStatus,
    }),
  },
  methods: {
    ...mapMutations("application", {
      toggleSideBar: AppStoreConstant.MUTATIONS.toogleSidebar,
    }),
    logout: function () {
      authService.signoutRedirect()
    },
  },
})

export default Home
</script>
<style lang="postcss" scoped>
.open-sidebar {
  @apply block z-20;
}

.closed-sidebar {
  @apply hidden lg:block;
}

.open-sidebar-overlay {
  @apply block fixed top-0 left-0 h-screen w-screen bg-gray-300 z-10 opacity-60;
}
</style>>

