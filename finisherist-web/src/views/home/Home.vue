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
        <div v-for="challengeItem in challenges" :key="challengeItem.Id">
          <p>{{challengeItem.title}}</p>
          <p>{{challengeItem.description}}</p>
          <p>{{challengeItem.status}}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue } from "vue-property-decorator"
import SvgImage from "../../components/SvgImage.vue"
import authService from "@/auth/authService"
import challengeApiService from "@/api-services/challenge-api-service"
import Challenge from "@/api-services/models/challenge"

const Home = Vue.extend({
  components: {
    SvgImage,
  },
  data: function () {
    return {
      challenges: [] as Challenge[]
    }
  },
  methods: {
    logout: function () {
      authService.signoutRedirect()
    },
  },
  created: function () {
    challengeApiService.getAll("hanguyen").then(value => {
      this.challenges = value.data;
    })
  },
})

export default Home;
</script>
