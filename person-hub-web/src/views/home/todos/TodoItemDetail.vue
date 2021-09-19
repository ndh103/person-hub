<template>
  <div class="border-red-300 border-b-2 p-4">
    <p class="font-medium">{{ todoItem.title }}</p>
    <p class="font-light">{{ todoItem.description }}</p>
    <p class="font-light">{{ todoItem.status }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import todoItemApiService from "@/api-services/todo-item-api-service"
import TodoItemModel from "@/api-services/models/TodoItemModel"

export default defineComponent({
  props: {
    todoItemId: {
      type: String,
    },
  },
  data: function () {
    return {
      todoItem: new TodoItemModel(),
    }
  },
  methods: {
    fetchTodoItemDetail: async function () {
      const response = await todoItemApiService.get(this.todoItemId)
      this.todoItem = response.data
    },
  },
  created: async function () {
    await this.fetchTodoItemDetail()
  },
})
</script>