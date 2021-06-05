<template>
  <div class="border-red-300 border-b-2 p-4">
    <span class="font-medium">{{ challengeOverview.title }}</span>
    <span class="font-light">{{ challengeOverview.description }}</span>
    <span class="font-light">{{ challengeOverview.status }}</span>
  </div>
</template>

<script lang="ts">
import Challenge from "@/api-services/models/ChallengeModel"
import { PropType } from "vue"
import { Vue } from "vue-property-decorator"

const ChallengeDetail = Vue.extend({
  props: {
    challengeOverview: {
      type: Object as PropType<Challenge>,
    },
  },
})

export default ChallengeDetail
</script>

<style>
</style>