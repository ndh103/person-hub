<script setup lang="ts">
  import CloseIcon from '@/assets/close-icon.svg?component'
  import appStoreService from '@/store/application/applicationStoreService'
  import TableIcon from '@/assets/table-icon.svg?component'
  import ClipBoardCheckIcon from '@/assets/clipboard-check-icon.svg?component'
  import SunIcon from '@/assets/sun-icon.svg?component'
  import { useRoute, useRouter } from 'vue-router'

  const route = useRoute()
  const router = useRouter()

  function isRouteActive(routeName: string) {
    return route.name == routeName
  }

  function navigateToRoute(routeName) {
    toggleSideBar(false)

    if (!isRouteActive(routeName)) {
      router.push({ name: routeName })
    }
  }

  function toggleSideBar(isOpen: boolean | null = null) {
    appStoreService.toggleSideBar(isOpen)
  }
</script>

<template>
  <aside>
    <div class="z-20 px-4">
      <div class="flex flex-row-reverse">
        <span class="hidden h-10 w-10 pr-2 cursor-pointer close-button" @click="toggleSideBar(false)">
          <CloseIcon class="w-4 h-4"></CloseIcon>
        </span>
      </div>

      <p class="pt-10"></p>
      <p :class="['sidebar-menu-item', isRouteActive('yourday-view') ? 'active' : '']" @click="navigateToRoute('yourday-view')">
        <SunIcon class="w-4 h-4 mr-2 inline-block" />Your Day
      </p>
      <p :class="['sidebar-menu-item', isRouteActive('events-view') ? 'active' : '']" @click="navigateToRoute('events-view')">
        <TableIcon class="w-4 h-4 mr-2 inline-block" /> Events
      </p>
      <p :class="['sidebar-menu-item', isRouteActive('finisher-list-view') ? 'active' : '']" @click="navigateToRoute('finisher-list-view')">
        <ClipBoardCheckIcon class="w-4 h-4 mr-2 inline-block" /> Finisher List
      </p>
    </div>
  </aside>
</template>

<style lang="postcss" scoped>
  .sidebar-menu-item {
    @apply rounded p-2 hover:bg-gray-300 cursor-pointer mb-2;
  }

  .active {
    @apply bg-gray-300;
  }

  .open-sidebar .close-button {
    @apply inline-block;
  }
</style>
>
