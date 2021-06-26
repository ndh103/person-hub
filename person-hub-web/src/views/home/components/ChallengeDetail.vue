<template>
  <div class="border-red-300 border-b-2 p-4">
    <p class="font-medium">{{ challenge.title }}</p>
    <p class="font-light">{{ challenge.description }}</p>
    <p class="font-light">{{ challenge.status }}</p>
  </div>
</template>

<script lang="ts">
import challengeApiService from "@/api-services/challenge-api-service"
import ChallengeModel from "@/api-services/models/ChallengeModel"
import { Vue } from "vue-property-decorator"

const ChallengeDetail = Vue.extend({
  props: {
    challengeId: {
      type : String 
    }
  },
  data: function () {
    return {
      challenge: new ChallengeModel()
    }
  },
  methods: {
    fetchChallengeDetail : async function(){
      const response = await challengeApiService.get(this.challengeId);
      this.challenge = response.data;
    },
  },
  watch:{
    "challengeId": async  function(){
      await this.fetchChallengeDetail();
    }
  },
  created: async function () {
     await this.fetchChallengeDetail();
  },
});

export default ChallengeDetail;
</script>

<style>
</style>