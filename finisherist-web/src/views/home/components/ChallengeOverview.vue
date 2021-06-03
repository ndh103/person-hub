<template>
  <div class="border-red-300 border-2 p-4">
      <p class="font-medium">{{challengeOverview.title}}</p>
      <p class="italic">{{challengeOverview.description}}</p>
      <p>{{challengeOverview.status}}</p>
  </div>
</template>

<script lang="ts">
import Challenge from "@/api-services/models/ChallengeModel"
import { PropType } from "vue"
import { Vue } from "vue-property-decorator"

const ChallengeOverview = Vue.extend({
    props:{
        challengeOverview: {
            type: Object as PropType<Challenge>
        }
    }
})

export default ChallengeOverview;
</script>

<style>
</style>