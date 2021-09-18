<template>
  <div class="p-2 m-2 flex flex-row w-full">
    <input type="text" v-model="newTodoItem.title" @keyup.enter="submitForm()" class="flex-1 py-2 mx-2 mt-2 rounded text-gray-700 border-gray-300 focus:border-blue-500" />
    <button class="flex-none w-auto bg-green-400 hover:bg-orange-700 rounded-lg shadow-xl text-white px-4 mx-2 mt-2" @click="submitForm()">Add</button>
  </div>
</template>

<script lang = "ts">
import TodoItemModel from "@/api-services/models/TodoItemModel"
import TodoItemStatusEnum from "@/api-services/models/TodoItemStatusEnum"
import { defineComponent } from 'vue'

export default defineComponent({
  data: function () {
    return {
      newTodoItem: new TodoItemModel(),
    }
  },
  methods: {
    submitForm: async function () {
      if(!this.newTodoItem.title){
        return;
      }

      this.newTodoItem.status = TodoItemStatusEnum.Initial
      this.$emit('onAddNewItem', {...this.newTodoItem});

      // Reset
      this.newTodoItem.title = '';
    },
  }
})
</script>