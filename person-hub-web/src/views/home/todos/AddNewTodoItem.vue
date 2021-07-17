<template>
  <div class="p-2 m-2 flex flex-row w-full">
    <input type="text" v-model="newTodoItem.title" class="flex-1 py-2 mx-2 mt-2 rounded text-gray-700 border-gray-300 focus:border-blue-500" />
    <button class="flex-none w-auto bg-orange-500 hover:bg-orange-700 rounded-lg shadow-xl text-white px-4 mx-2 mt-2" @click="submitForm()">Add</button>
  </div>
</template>

<script lang = "ts">
import { Vue } from "vue-property-decorator"
import TodoItemModel from "@/api-services/models/TodoItemModel"
import TodoItemStatusEnum from "@/api-services/models/TodoItemStatusEnum"
// import todoItemApiService from "@/api-services/todo-item-api-service"

const AddNewTodoItem = Vue.extend({
  data: function () {
    return {
      newTodoItem: new TodoItemModel(),
    }
  },
  methods: {
    submitForm: async function () {
      this.newTodoItem.status = TodoItemStatusEnum.Initial
      // await todoItemApiService.add(this.newTodoItem)
      this.$emit('onAddNewItem', {...this.newTodoItem});

      // Reset
      this.newTodoItem.title = '';
    },
  },
})

export default AddNewTodoItem
</script>

<style>
</style>