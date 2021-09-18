<template>
  <div>
    <add-new-todo-item @onAddNewItem="addNewTodoItem($event)"></add-new-todo-item>
    <button class="block w-auto bg-purple-500 hover:bg-purple-700 rounded-lg shadow-xl text-white py-2 px-4 mx-2 mt-2" @click="fetchTodoItems()">Refresh <svg-image class="h-2 w-2 inline-block" icon="refresh-icon.svg"></svg-image></button>
    <!-- <draggable v-model="todoItemList" item-key="id" v-bind="dragOptions" @start="drag = true" @end="onDragEnd($event)" handle=".handle-icon" :class="{ dragging: drag, 'no-drag': !drag }">
      <template #item="{item}">
        <transition name="slide-fade">
          <todo-item-overview :todoItemOverview="item" @onItemMarkedAsDone="onItemMarkedAsDone()" v-show="item.status != 1"></todo-item-overview>
        </transition>
      </template>
    </draggable> -->

    <div v-for="todoItemOverview in todoItemList" :key="todoItemOverview.id">
        <transition name="slide-fade">
          <todo-item-overview :todoItemOverview="todoItemOverview" @onItemMarkedAsDone="onItemMarkedAsDone()" v-show="todoItemOverview.status != 1"></todo-item-overview>
        </transition>
      </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import TodoItemModel from "@/api-services/models/TodoItemModel"
import TodoItemOverview from "@/views/home/todos/TodoItemOverview.vue"
import todoItemApiService from "@/api-services/todo-item-api-service"
import TodoItemStatusEnum from "@/api-services/models/TodoItemStatusEnum"
import AddNewTodoItem from "./AddNewTodoItem.vue"
import SvgImage from "@/components/SvgImage.vue"
import draggable from "vuedraggable"
import LexicoGraphicalUtility from "@/common/lexico-string-generator"

export default defineComponent({
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
      // get the current order of the last item
      const lastItem = this.todoItemList.last()

      const nextOrder = LexicoGraphicalUtility.generateMidString(lastItem ? lastItem.itemOrder : "", "")
      todoItem.itemOrder = nextOrder

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
      this.todoItemList.sort((a, b) => (a.itemOrder > b.itemOrder ? 1 : -1))
    },
    onDragEnd: async function (evt) {
      const newIndex = evt.newIndex
      const prevItem = newIndex == 0 ? null : this.todoItemList[newIndex - 1]
      const nextItem = newIndex == this.todoItemList.length - 1 ? null : this.todoItemList[newIndex + 1]

      const newOrder = LexicoGraphicalUtility.generateMidString(prevItem ? prevItem.itemOrder : "", nextItem ? nextItem.itemOrder : "")
      const item = this.todoItemList[newIndex]
      item.itemOrder = newOrder

      await todoItemApiService.update(item)

      this.drag = false
    },
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

.sortable-drag {
  @apply bg-white;
}

.sortable-ghost {
  @apply opacity-50 bg-green-400;
}
</style>