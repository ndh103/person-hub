<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import todoItemApiService from './api-services/todo-item-api-service'
  import TodoItemModel from './api-services/models/TodoItemModel'

  const props = defineProps({
    todoItemId: {
      type: String,
      default: '',
    },
  })

  const state = ref({
    todoItem: new TodoItemModel(),
  })

  onMounted(async () => {
    await fetchTodoItemDetail()
  })

  async function fetchTodoItemDetail() {
    const response = await todoItemApiService.get(props.todoItemId)
    state.value.todoItem = response.data as TodoItemModel
  }
</script>

<template>
  <div class="border-b border-gray-400 border-opacity-25">
    <p class="font-medium">{{ state.todoItem.title }}</p>
    <p class="font-light">{{ state.todoItem.description }}</p>
    <p class="font-light">{{ state.todoItem.status }}</p>
  </div>
</template>
