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
        <challenge-list :challengeList = "challengeList"></challenge-list>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue } from "vue-property-decorator"
import SvgImage from "../../components/SvgImage.vue"
import authService from "@/auth/authService"
import challengeApiService from "@/api-services/challenge-api-service"
import Challenge from "@/api-services/models/ChallengeModel"
import ChallengeList from "@/components/Challenge/ChallengeList.vue"
import AddNewChallenge from "@/components/Challenge/AddNewChallenge.vue"

const Home = Vue.extend({
  components: {
    SvgImage,
    ChallengeList, 
    AddNewChallenge
  },
  data: function () {
    return {
      challengeList: [] as Challenge[]
    }
  },
  methods: {
    logout: function () {
      authService.signoutRedirect()
    },
  },
  created: function () {
    challengeApiService.getAll("hanguyen").then(value => {
      this.challengeList = value.data;
    })
  },
})

export default Home;
</script>
