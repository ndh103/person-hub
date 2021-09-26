<template>
  <div class="mb-4 flex flex-row w-full">
    <input
      v-model="newTodoItem.title"
      type="text"
      class="app-input w-full"
      @keyup.enter="submitForm()"
    />
    <button class="app-btn-primary" @click="submitForm()">Add</button>
  </div>
</template>

<script lang="ts">
  import TodoItemModel from '@/api-services/models/TodoItemModel'
  import TodoItemStatusEnum from '@/api-services/models/TodoItemStatusEnum'
  import { defineComponent } from 'vue'

  export default defineComponent({
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

        this.newTodoItem.status = TodoItemStatusEnum.Initial
        this.$emit('onAddNewItem', { ...this.newTodoItem })

        // Reset
        this.newTodoItem.title = ''
      },
    },
  })
</script>
