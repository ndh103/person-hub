<template>
  <div class="mb-4 flex flex-row">
    <input
      v-model="newTodoItem.title"
      type="text"
      class="app-input flex-grow"
      placeholder="Add new todo item..."
      @keyup.enter="submitForm()"
    />

    <button class="app-btn-primary" @click="submitForm()">
      <PlusIcon class="w-4 h-4 inline" /> Add
    </button>
  </div>
</template>

<script lang="ts">
  import TodoItemModel from '@/api-services/models/TodoItemModel'
  import TodoItemStatusEnum from '@/api-services/models/TodoItemStatusEnum'
  import PlusIcon from '@/assets/plus-icon.svg?component'
  import { defineComponent } from 'vue'

  export default defineComponent({
    components: {
      PlusIcon,
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

        this.newTodoItem.status = TodoItemStatusEnum.Initial
        this.$emit('onAddNewItem', { ...this.newTodoItem })

        // Reset
        this.newTodoItem.title = ''
      },
    },
  })
</script>
