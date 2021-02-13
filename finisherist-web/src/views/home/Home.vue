<template>
  <div>
    <div id="page-header" class="bg-red-600 text-white h-10 flex justify-between">
      <div>This should be the header</div>
      <!-- <img src="../../assets/user-icon.svg" /> -->

      <svg-image icon="user-icon.svg"></svg-image>
    </div>
    <div id="page-content" class="bg-gray-400 flex">
      <div class="bg-yellow-400 w-1/4">Side bar menu</div>
      <div class="bg-white flex-grow">Content here</div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator"
import SvgImage from "../../components/SvgImage.vue"

@Component({
  components: {
    SvgImage
  },
})
export default class Home extends Vue {}
</script>
