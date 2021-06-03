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
        <add-new-challenge></add-new-challenge>
        <button class='w-auto bg-indigo-500 hover:bg-indigo-700 rounded-lg shadow-xl font-medium text-white px-4 py-2' @click="fetchChallenges()">Refresh</button>
        <challenge-list :challengeList="challengeList"></challenge-list>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue } from "vue-property-decorator"
import SvgImage from "../../components/SvgImage.vue"
import authService from "@/auth/authService"
import challengeApiService from "@/api-services/challenge-api-service"
import ChallengeModel from "@/api-services/models/ChallengeModel"
import ChallengeList from "@/views/home/components/ChallengeList.vue"
import AddNewChallenge from "@/views/home/components/AddNewChallenge.vue"

const Home = Vue.extend({
  components: {
    SvgImage,
    ChallengeList,
    AddNewChallenge,
  },
  data: function () {
    return {
      challengeList: [] as ChallengeModel[],
    }
  },
  methods: {
    logout: function () {
      authService.signoutRedirect()
    },
    fetchChallenges : async function(){
      const response = await challengeApiService.getAll();
      this.challengeList = response.data;
    },
  },

  created: async function () {
     await this.fetchChallenges();
  },
})

export default Home
</script>
