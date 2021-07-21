<template>
  <div>
    <add-new-todo-item @onAddNewItem="addNewTodoItem($event)"></add-new-todo-item>
    <button class="block w-auto bg-purple-500 hover:bg-purple-700 rounded-lg shadow-xl text-white py-2 px-4 mx-2 mt-2" @click="fetchTodoItems()">Refresh <svg-image class="h-2 w-2 inline-block" icon="refresh-icon.svg"></svg-image></button>
    <draggable v-model="todoItemList" v-bind="dragOptions" @start="drag = true" @end="onDragEnd()" handle=".handle-icon" :class="{'dragging': drag, 'no-drag': !drag}">
        <div v-for="todoItemOverview in todoItemList" :key="todoItemOverview.id">
          <transition name="slide-fade">
            <todo-item-overview :todoItemOverview="todoItemOverview" @onItemMarkedAsDone="onItemMarkedAsDone()" v-show="todoItemOverview.status != 1"></todo-item-overview>
          </transition>
        </div>
    </draggable>
  </div>
</template>

<script lang="ts">
import { Vue } from "vue-property-decorator"
import TodoItemModel from "@/api-services/models/TodoItemModel"
import TodoItemOverview from "@/views/home/todos/TodoItemOverview.vue"
import todoItemApiService from "@/api-services/todo-item-api-service"
import TodoItemStatusEnum from "@/api-services/models/TodoItemStatusEnum"
import AddNewTodoItem from "./AddNewTodoItem.vue"
import SvgImage from "@/components/SvgImage.vue"
import draggable from "vuedraggable"

const TodoItemList = Vue.extend({
  components: {
    TodoItemOverview,
    AddNewTodoItem,
    SvgImage,
    draggable,
  },
  props: {},
  data: function () {
    return {
      todoItemList: [] as TodoItemModel[],
      drag: false,
    }
  },
  methods: {
    addNewTodoItem: async function (todoItem: TodoItemModel) {
      this.todoItemList.push(todoItem)

      const response = await todoItemApiService.add(todoItem)

      // Update the todoItem from response
      todoItem = response.data
    },
    onItemMarkedAsDone() {
      this.todoItemList = this.todoItemList.filter((r) => r.status != TodoItemStatusEnum.Finished)
    },
    fetchTodoItems: async function () {
      const response = await todoItemApiService.query(TodoItemStatusEnum.Initial)
      this.todoItemList = response.data
    },
    onDragEnd: function(){
      this.drag = false;
    }
  },
  computed: {
    dragOptions() {
      return {
        animation: 200,
        disabled: false,
      }
    },
  },
  created: async function () {
    await this.fetchTodoItems()
  },
})

export default TodoItemList
</script>

<style lang="postcss" scoped>
/* Enter and leave animations can use different */
/* durations and timing functions.              */
.slide-fade-enter-active {
  transition: all 0.3s ease;
}
.slide-fade-leave-active {
  transition: all 0.5s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter, .slide-fade-leave-to
/* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateX(10px);
  opacity: 0;
}

.sortable-drag{
    @apply bg-white;
}

.sortable-ghost {
  @apply opacity-50 bg-rose-400;
}
</style>