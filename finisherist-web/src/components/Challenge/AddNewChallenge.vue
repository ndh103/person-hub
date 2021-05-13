<template>
  <div>
    <span class="text-gray-700">Title</span>
    

    
  </div>
</template>

<script lang = "ts">
import ChallengeModel from "@/api-services/models/ChallengeModel"
import { Vue } from "vue-property-decorator"

const AddNewChallenge = Vue.extend({
  data: function () {
    return {
      newChallenge: new ChallengeModel(),
    }
  },
})

export default AddNewChallenge
</script>

<style>
</style>