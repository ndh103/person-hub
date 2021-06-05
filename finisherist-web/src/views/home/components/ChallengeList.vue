<template>
  <div>
    <button class='w-auto bg-indigo-500 hover:bg-indigo-700 rounded-lg shadow-xl font-medium text-white px-4 py-2' @click="fetchChallenges()">Fetch</button>
    
    <div v-for="challengeOverview in challengeList" :key="challengeOverview.id">
      <challenge-overview :challengeOverview="challengeOverview"></challenge-overview>  
    </div>
     
  </div>
</template>

<script lang="ts">
import ChallengeModel from "@/api-services/models/ChallengeModel";
import { Vue } from "vue-property-decorator"
import ChallengeOverview from "@/views/home/components/ChallengeOverview.vue"
import challengeApiService from "@/api-services/challenge-api-service";

const ChallengeList = Vue.extend({
  components:{
    ChallengeOverview
  },
  props: {
    challengeStatus: {
      type : String 
    }
  },
  data: function () {
    return {
      challengeList: [] as ChallengeModel[],
    }
  },
  methods: {
    fetchChallenges : async function(){
      const response = await challengeApiService.query(this.challengeStatus);
      this.challengeList = response.data;
    },
  },
  watch:{
    "challengeStatus": async  function(){
      await this.fetchChallenges();
    }
  },
  created: async function () {
     await this.fetchChallenges();
  },
})

export default ChallengeList;

</script>