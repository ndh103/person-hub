<script setup lang="ts">
  import TodoItemModel from './api-services/models/TodoItemModel'
  import TodoItemStatusEnum from './api-services/models/TodoItemStatusEnum'
  import { defineComponent, PropType, ref } from 'vue'
  import TodoItemTypeEnum from './api-services/models/TodoItemTypeEnum'

  const emit = defineEmits<{
    (event: 'onAddNewItem', data: TodoItemModel)
  }>()

  const { itemType } = defineProps({
    itemType: {
      type: Number as PropType<TodoItemTypeEnum>,
      default: TodoItemTypeEnum.Todo,
    },
  })

  const state = ref({
    newTodoItem: new TodoItemModel(),
  })

  async function submitForm() {
    if (!state.value.newTodoItem.title) {
      return
    }

    state.value.newTodoItem.type = itemType
    state.value.newTodoItem.status = TodoItemStatusEnum.Initial
    emit('onAddNewItem', { ...state.value.newTodoItem })

    // Reset
    state.value.newTodoItem.title = ''
  }
</script>

<template>
  <div class="mb-4 flex flex-row items-center">
    <input v-model="state.newTodoItem.title" type="text" class="app-input flex-grow" placeholder="Input and press enter to add new ..." @keyup.enter="submitForm()" />
  </div>
</template>
