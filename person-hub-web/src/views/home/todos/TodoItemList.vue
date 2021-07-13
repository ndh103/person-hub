<template>
  <div>
    <button class='w-auto bg-indigo-500 hover:bg-indigo-700 rounded-lg shadow-xl font-medium text-white px-4 py-2' @click="fetchTodoItems()">Fetch</button>
    
    <div v-for="todoItemOverview in todoItemList" :key="todoItemOverview.id">
      <todo-item-overview :todoItemOverview="todoItemOverview"></todo-item-overview>  
    </div>
     
  </div>
</template>

<script lang="ts">
  import { Vue } from "vue-property-decorator"
import TodoItemModel from "@/api-services/models/TodoItemModel";
import TodoItemOverview from "@/views/home/todos/TodoItemOverview.vue"
import todoItemApiService from "@/api-services/todo-item-api-service";
import TodoItemStatusEnum from "@/api-services/models/TodoItemStatusEnum";

const TodoItemList = Vue.extend({
  components:{
    TodoItemOverview
  },
  props: {
  },
  data: function () {
    return {
      todoItemList: [] as TodoItemModel[],
    }
  },
  methods: {
    fetchTodoItems : async function(){
      const response = await todoItemApiService.query(TodoItemStatusEnum.Initial);
      this.todoItemList = response.data;
    },
  },
  created: async function () {
     await this.fetchTodoItems();
  },
})

export default TodoItemList;

</script>