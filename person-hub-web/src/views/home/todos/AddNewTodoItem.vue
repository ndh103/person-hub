<template>
  <div class="grid-cols-1 border-indigo-400 border-2 p-2 m-2 rounded">
    <div>
      <label class="text-gray-700 dark:text-gray-200" for="username">Title</label>
      <input
        type="text"
        v-model="newTodoItem.title"
        class="block w-full px-4 py-2 mt-2 text-gray-700 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring"
      />
    </div>

    <div>
      <label class="text-gray-700 dark:text-gray-200" for="username">Description</label>
      <input
        type="text"
        v-model="newTodoItem.description"
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
  import { Vue } from "vue-property-decorator"
import TodoItemModel from "@/api-services/models/TodoItemModel"
import TodoItemStatusEnum from "@/api-services/models/TodoItemStatusEnum"
import todoItemApiService from "@/api-services/todo-item-api-service"

const AddNewTodoItem = Vue.extend({
  data: function () {
    return {
      newTodoItem: new TodoItemModel()
    }
  },
  methods:{
    submitForm: async function(){
        this.newTodoItem.status = TodoItemStatusEnum.Initial;
        await todoItemApiService.add(this.newTodoItem);
    }
  }
})

export default AddNewTodoItem
</script>

<style>
</style>