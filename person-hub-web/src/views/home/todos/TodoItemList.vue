<template>
  <div>
    <add-new-todo-item @onAddNewItem = "addNewTodoItem($event)"></add-new-todo-item>
    <button class="block w-auto bg-purple-500 hover:bg-purple-700 rounded-lg shadow-xl text-white py-2 px-4 mx-2 mt-2" @click="fetchTodoItems()">
      Refresh <svg-image class="h-2 w-2 inline-block" icon="refresh-icon.svg"></svg-image>
    </button>
    
    <div v-for="todoItemOverview in todoItemList" :key="todoItemOverview.id">
      <todo-item-overview :todoItemOverview="todoItemOverview"></todo-item-overview>  
    </div>
     
  </div>
</template>

<script lang="ts">
  import { Vue } from "vue-property-decorator"
import TodoItemModel from "@/api-services/models/TodoItemModel";
import TodoItemOverview from "@/views/home/todos/TodoItemOverview.vue"
import todoItemApiService from "@/api-services/todo-item-api-service"
import TodoItemStatusEnum from "@/api-services/models/TodoItemStatusEnum"
import AddNewTodoItem from "./AddNewTodoItem.vue"
import SvgImage from "@/components/SvgImage.vue";

const TodoItemList = Vue.extend({
  components:{
    TodoItemOverview,
    AddNewTodoItem,
    SvgImage
  },
  props: {
  },
  data: function () {
    return {
      todoItemList: [] as TodoItemModel[],
    }
  },
  methods: {
    addNewTodoItem: async function(todoItem: TodoItemModel){
      this.todoItemList.push(todoItem);
      const response = await todoItemApiService.add(todoItem);

      // Update the todoItem from response
      todoItem = response.data;
    },
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