<template>
  <div>
    <header class="bg-red-600 text-white h-10 flex justify-between fixed w-full p-1 antialiased font-light text-xl">
      <div class="pl-4">
        <svg-image customClass="h-7 w-7 inline-block" icon="check-list-icon.svg"></svg-image>
        Finisherist
      </div>
      <svg-image customClass="h-7 w-7" icon="user-icon.svg"></svg-image>
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

@Component({
  components: {
    SvgImage,
  },
})
export default class Home extends Vue {}
</script>
