<template>
  <header class="bg-green-500 text-white h-10 flex justify-between fixed w-full p-1 antialiased font-light text-xl">
    <div class="pl-4">
      <span @click="toggleSideBar()">
        <MenuIcon class="inline-block h-6 w-6 lg:hidden"></MenuIcon>
      </span>
      Person Hub
    </div>
    <div class="pr-5 cursor-pointer">
      <img :src="$auth.user.picture" class="h-7 w-7 inline-block mr-3" />

      <button class="text-xs" @click="logout()">Logout</button>
    </div>
  </header>
</template>

<script lang="ts">
  import MenuIcon from '@/assets/menu-icon.svg?component'
  import appStoreService from '@/store/application/applicationStoreService'
  import { defineComponent } from 'vue'

  export default defineComponent({
    components: {
      MenuIcon,
    },
    methods: {
      logout() {
        this.$auth.logout()
      },
      toggleSideBar() {
        return appStoreService.toggleSideBar()
      },
    },
  })
</script>

<style lang="postcss" scoped></style>
