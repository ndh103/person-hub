<template>
  <div class="text-sm">
    <site-header></site-header>

    <div class="flex">
      <div
        class="hidden"
        :class="[overlaySideBarStatus + '-sidebar-overlay']"
      ></div>
      <aside-menu
        class="
          flex-none
          w-80
          h-screen
          fixed
          top-0
          left-0
          pt-8
          bg-gray-50
          lg:static lg:block
        "
        :class="[overlaySideBarStatus + '-sidebar']"
      ></aside-menu>
      <main
        class="flex-grow p-4 h-full pt-14 container mx-auto max-w-screen-lg"
      >
        <router-view></router-view>
      </main>
    </div>

    <Loading></Loading>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import { mapGetters } from 'vuex'
  import SiteHeader from './SiteHeader.vue'
  import AppStoreConstant from '@/store/application/application-store-constant'
  import AsideMenu from './AsideMenu.vue'
  import Loading from '@/components/Loading.vue'

  export default defineComponent({
    components: {
      SiteHeader,
      AsideMenu,
      Loading,
    },
    props: {},
    computed: {
      ...mapGetters('application', {
        overlaySideBarStatus: AppStoreConstant.GETTERS.overlaySideBarStatus,
      }),
    },
  })
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
</style>
