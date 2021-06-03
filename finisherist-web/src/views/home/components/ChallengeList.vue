<template>
  <div>
    
    <div v-for="challengeOverview in challengeList" :key="challengeOverview.id">
      <challenge-overview :challengeOverview="challengeOverview"></challenge-overview>  
    </div>
     
  </div>
</template>

<script lang="ts">
import Challenge from "@/api-services/models/ChallengeModel";
import { PropType } from "vue";
import { Vue } from "vue-property-decorator"
import ChallengeOverview from "@/views/home/components/ChallengeOverview.vue"

const ChallengeList = Vue.extend({
  components:{
    ChallengeOverview
  },
  props: {
    challengeList: {
      type: Array as PropType<Challenge[]>
    }
  }
})

export default ChallengeList;

</script>

<style>

</style>