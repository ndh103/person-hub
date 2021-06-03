<template>
  <div class="grid-cols-1 border-indigo-400 border-2 p-2 m-2 rounded">
    <div>
      <label class="text-gray-700 dark:text-gray-200" for="username">Title</label>
      <input
        type="text"
        v-model="newChallenge.title"
        class="block w-full px-4 py-2 mt-2 text-gray-700 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring"
      />
    </div>

    <div>
      <label class="text-gray-700 dark:text-gray-200" for="username">Description</label>
      <input
        type="text"
        v-model="newChallenge.description"
        class="block w-full px-4 py-2 mt-2 text-gray-700 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring"
      />
    </div>

    <div class="my-2">
      <button class='w-auto bg-gray-500 hover:bg-gray-700 rounded-lg shadow-xl font-medium text-white px-4 py-2 mr-2'>Cancel</button>
      <button class='w-auto bg-orange-500 hover:bg-orange-700 rounded-lg shadow-xl font-medium text-white px-4 py-2' @click="submitForm()">Create</button>
    </div>

  </div>
</template>

<script lang = "ts">
import ChallengeModel from "@/api-services/models/ChallengeModel"
import ChallengeStatusEnum from "@/api-services/models/ChallengeStatusEnum"
import challengeApiService from "@/api-services/challenge-api-service"
import { Vue } from "vue-property-decorator"


const AddNewChallenge = Vue.extend({
  data: function () {
    return {
      newChallenge: new ChallengeModel()
    }
  },
  methods:{
    submitForm: async function(){
        this.newChallenge.status = ChallengeStatusEnum.Initial;
        await challengeApiService.add(this.newChallenge);
    }
  }
})

export default AddNewChallenge
</script>

<style>
</style>