<script setup lang="ts">
  import appStoreService from '@/store/application/applicationStoreService'
  import MenuIcon from '@/assets/menu-icon.svg?component'
  import PeopleIcon from '@/assets/people-icon.svg?component'
  import { getCurrentInstance } from 'vue'

  const app = getCurrentInstance()

  function logout(){
    const auth = app.appContext.config.globalProperties.$auth
    auth.logout();
  }

  function toggleSideBar(){
    return appStoreService.toggleSideBar();
  }
</script>

<template>
  <header class="bg-emerald-500 text-white h-10 flex justify-between fixed w-full p-1 antialiased font-light text-xl">
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

<style lang="postcss" scoped></style>
