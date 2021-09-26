<template>
  <aside>
    <div class="z-20 px-4">
      <div class="flex flex-row-reverse">
        <span
          class="hidden h-10 w-10 pr-2 cursor-pointer close-button"
          @click="toggleSideBar()"
        >
          <CloseIcon></CloseIcon>
        </span>
      </div>

      <p class="pt-10"></p>
      <p
        :class="[
          'sidebar-menu-item',
          isRouteActive('todos-view') ? 'active' : '',
        ]"
        @click="navigateToRoute('todos-view')"
      >
        <ClipBoardListIcon class="w-4 h-4 mr-2 inline-block" />Todo Items
      </p>
      <p
        :class="[
          'sidebar-menu-item',
          isRouteActive('events-view') ? 'active' : '',
        ]"
        @click="navigateToRoute('events-view')"
      >
        <TableIcon class="w-4 h-4 mr-2 inline-block" /> Events
      </p>
    </div>
  </aside>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import CloseIcon from '@/assets/close-icon.svg?component'
  import appStoreService from '@/store/application/applicationStoreService'
  import TableIcon from '@/assets/table-icon.svg?component'
  import ClipBoardListIcon from '@/assets/clipboard-list-icon.svg?component'

  export default defineComponent({
    components: {
      CloseIcon,
      TableIcon,
      ClipBoardListIcon,
    },
    methods: {
      isRouteActive: function (routeName: string) {
        return this.$route.name == routeName
      },
      navigateToRoute(routeName) {
        if (!this.isRouteActive(routeName)) {
          this.$router.push({ name: routeName })
        }
      },
      toggleSideBar() {
        appStoreService.toggleSideBar()
      },
    },
  })
</script>
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
