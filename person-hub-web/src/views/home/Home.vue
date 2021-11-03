<template>
  <div class="text-sm">
    <site-header></site-header>

    <div class="flex">
      <div class="hidden" :class="[applicationStoreService.state.overlaySidebarStatus + '-sidebar-overlay']" @click="toogleSideBar()"></div>
      <aside-menu
        class="flex-none w-80 h-screen fixed top-0 left-0 pt-8 bg-gray-50 lg:static lg:block"
        :class="[applicationStoreService.state.overlaySidebarStatus + '-sidebar']"
      ></aside-menu>

      <div class="w-full h-screen overflow-auto">
        <main class="flex-grow p-4 pt-16 container mx-auto max-w-screen-lg">
          <router-view></router-view>
        </main>
      </div>
    </div>

    <Loading></Loading>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import SiteHeader from './SiteHeader.vue'
  import AsideMenu from './AsideMenu.vue'
  import Loading from '@/components/Loading.vue'
  import applicationStoreService from '@/store/application/applicationStoreService'

  export default defineComponent({
    components: {
      SiteHeader,
      AsideMenu,
      Loading,
    },
    props: {},
    computed: {
      applicationStoreService() {
        return applicationStoreService
      },
    },
    methods: {
      toogleSideBar() {
        this.applicationStoreService.toggleSideBar()
      },
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
