<template>
  <aside>
    <p class="pt-10"></p>
    <p :class="['sidebar-menu-item', isRouteActive('todos-view') ? 'active' : '']" @click="navigateToRoute('todos-view')">Todo Items</p>
    <p :class="['sidebar-menu-item', isRouteActive('events-view') ? 'active' : '']" @click="navigateToRoute('events-view')">Events</p>
  </aside>
</template>

<script lang="ts">
import { Vue } from "vue-property-decorator"

const AsideMenuItem = Vue.extend({
  components: {
  },
  props: {},
  methods: {
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

export default AsideMenuItem
</script>
<style lang="postcss" scoped>
.sidebar-menu-item {
  @apply rounded p-2 hover:bg-gray-300 cursor-pointer;
}

.active {
  @apply bg-gray-300;
}
</style>>

