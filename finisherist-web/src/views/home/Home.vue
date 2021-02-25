<template>
  <div>
    <header class="bg-red-600 text-white h-10 flex justify-between fixed w-full p-1 antialiased font-light text-xl">
      <div class="pl-4">
        <svg-image class="h-7 w-7 inline-block" icon="check-list-icon.svg"></svg-image>
        Finisherist
      </div>
      <div>
        <svg-image class="h-7 w-7 inline-block" icon="user-icon.svg"></svg-image>
        <button @click="logout()">Logout</button>
      </div>
      
    </header>

    <div class="flex">
      <div class="top-0 p-10 h-screen flex-none bg-gray-50">Sticky side bar</div>
      <div class="flex-grow p-4 h-full pt-10">
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
        Body Content <br />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator"
import SvgImage from "../../components/SvgImage.vue"
import authService from "@/auth/authService"

@Component({
  components: {
    SvgImage,
  },
  methods: {
    logout: function () {
      authService.signoutRedirect()
    },
  },
})
export default class Home extends Vue {}
</script>
