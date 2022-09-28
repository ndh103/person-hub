<script setup lang="ts">
  import TodoItemModel from './api-services/models/TodoItemModel'
  import TodoItemStatusEnum from './api-services/models/TodoItemStatusEnum'
  import { ref } from 'vue'

  const emit = defineEmits<{
    (event: 'onAddNewItem', data: TodoItemModel)
  }>()

  const { topicId } = defineProps({
    topicId: {
      type: Number,
      default: null,
    },
  })

  const state = ref({
    newTodoItem: new TodoItemModel(),
  })

  async function submitForm() {
    if (!state.value.newTodoItem.title) {
      return
    }

    state.value.newTodoItem.todoTopicId = topicId
    state.value.newTodoItem.status = TodoItemStatusEnum.Initial
    emit('onAddNewItem', { ...state.value.newTodoItem })

    // Reset
    state.value.newTodoItem.title = ''
  }
</script>

<template>
  <div class="mb-4 flex flex-row items-center">
    <input v-model="state.newTodoItem.title" type="text" class="app-input flex-grow" placeholder="Add new todo ..." @keyup.enter="submitForm()" />
  </div>
</template>
