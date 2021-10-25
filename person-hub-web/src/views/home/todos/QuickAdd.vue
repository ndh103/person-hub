<template>
  <div class="mb-4 flex flex-row items-center">
    <input v-model="newTodoItem.title" type="text" class="app-input flex-grow" placeholder="Input and press enter to add new ..." @keyup.enter="submitForm()" />
  </div>
</template>

<script lang="ts">
  import TodoItemModel from './api-services/models/TodoItemModel'
  import TodoItemStatusEnum from './api-services/models/TodoItemStatusEnum'
  import { defineComponent, PropType } from 'vue'
  import TodoItemTypeEnum from './api-services/models/TodoItemTypeEnum'

  export default defineComponent({
    props: {
      itemType: {
        type: Number as PropType<TodoItemTypeEnum>,
        default: TodoItemTypeEnum.Todo,
      },
    },
    emits: ['onAddNewItem'],
    data: function () {
      return {
        newTodoItem: new TodoItemModel(),
      }
    },
    methods: {
      submitForm: async function () {
        if (!this.newTodoItem.title) {
          return
        }

        this.newTodoItem.type = this.itemType
        this.newTodoItem.status = TodoItemStatusEnum.Initial
        this.$emit('onAddNewItem', { ...this.newTodoItem })

        // Reset
        this.newTodoItem.title = ''
      },
    },
  })
</script>
