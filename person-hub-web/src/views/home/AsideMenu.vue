<template>
  <aside>
    <div class="z-20">
      <div class="flex flex-row-reverse">
        <span class="hidden h-10 w-10 pr-2 cursor-pointer close-button" @click="toggleSideBar()">
          <CloseIcon></CloseIcon>
        </span>
      </div>

      <p class="pt-10"></p>
      <p :class="['sidebar-menu-item', isRouteActive('todos-view') ? 'active' : '']" @click="navigateToRoute('todos-view')">Todo Items</p>
      <p :class="['sidebar-menu-item', isRouteActive('events-view') ? 'active' : '']" @click="navigateToRoute('events-view')">Events</p>
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { mapMutations } from "vuex"
import AppStoreConstant from "@/store/application/application-store-constant"
import CloseIcon from "@/assets/close-icon.svg?component"

export default defineComponent({
  components: {
    CloseIcon
  },
  methods: {
    ...mapMutations("application", {
      toggleSideBar: AppStoreConstant.MUTATIONS.toogleSidebar,
    }),
    isRouteActive: function (routeName: string) {
      return this.$route.name == routeName
    },
    navigateToRoute(routeName) {
      if (!this.isRouteActive(routeName)) {
        this.$router.push({ name: routeName })
      }
    },
  },
})

</script>
<style lang="postcss" scoped>
.sidebar-menu-item {
  @apply rounded p-2 hover:bg-gray-300 cursor-pointer;
}

.active {
  @apply bg-gray-300;
}

.open-sidebar .close-button{
  @apply inline-block;
}

</style>>

