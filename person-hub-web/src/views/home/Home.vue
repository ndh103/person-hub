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
      <aside class="top-0 pt-10 pl-10 h-screen flex-none bg-gray-50 w-80">
        <p class="pt-10"></p>
        <p :class="['sidebar-menu-item', isRouteActive('todos-view') ? 'active':'']" @click="navigateToRoute('todos-view')">
          Todo Items
        </p>

        <p :class="['sidebar-menu-item', isRouteActive('events-view') ? 'active':'']" @click="navigateToRoute('events-view')">
          Events
        </p>

      </aside>
      <main class="flex-grow p-4 h-full pt-10">
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue } from "vue-property-decorator"
import SvgImage from "../../components/SvgImage.vue"
import authService from "@/auth/authService"

const Home = Vue.extend({
  components: {
    SvgImage,
  },
  props: {
  },
  methods: {
    logout: function () {
      authService.signoutRedirect()
    },
    isRouteActive: function(routeName: string){
      return this.$route.name == routeName;
    },
    navigateToRoute(routeName){
      if(!this.isRouteActive(routeName)){
        this.$router.push({name: routeName });
      }
      
    }
  },
});

export default Home;

</script>
<style lang="postcss" scoped>
  .sidebar-menu-item{
    @apply rounded p-2 hover:bg-gray-300 cursor-pointer;
  }

  .active{
    @apply bg-gray-300;
  }
</style>>

