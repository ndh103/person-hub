<template>
  <header class="bg-green-500 text-white h-10 flex justify-between fixed w-full p-1 antialiased font-light text-xl">
    <div class="pl-4 flex items-center">
      <span @click="toggleSideBar()">
        <MenuIcon class="inline-block h-6 w-6 lg:hidden"></MenuIcon>
      </span>
      <div class="pr-2">
        <PeopleIcon class="w-6 h-6 inline-block fill-current" />
      </div>
      <div class="pt-1">Person Hub</div>
    </div>
    <div class="pr-5 cursor-pointer">
      <img :src="$auth.user.picture" class="h-7 w-7 inline-block mr-3" />

      <button class="text-xs" @click="logout()">Logout</button>
    </div>
  </header>
</template>

<script lang="ts">
  import appStoreService from '@/store/application/applicationStoreService'
  import { defineComponent } from 'vue'
  import MenuIcon from '@/assets/menu-icon.svg?component'
  import PeopleIcon from '@/assets/people-icon.svg?component'

  export default defineComponent({
    components: {
      MenuIcon,
      PeopleIcon,
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
