<template>
  <div>
    <add-new-todo-item @onAddNewItem="addNewTodoItem($event)"></add-new-todo-item>

    <span class="hover:cursor-pointer hover:text-green-700 text-green-500 mb-4" @click="fetchTodoItems()">
      <RefreshIcon class="h-4 w-4 inline-block" />
      Refresh
    </span>

    <draggable
      v-model="todoItems"
      item-key="id"
      v-bind="dragOptions"
      handle=".handle-icon"
      :class="{ dragging: drag, 'no-drag': !drag }"
      @start="drag = true"
      @end="onDragEnd($event)"
    >
      <template #item="{ element }">
        <transition name="slide-fade">
          <todo-item-overview v-show="element.status != 1" :todo-item-overview="element" @onItemMarkedAsDone="onItemMarkedAsDone()"></todo-item-overview>
        </transition>
      </template>
    </draggable>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import TodoItemModel from '@/api-services/models/TodoItemModel'
  import TodoItemOverview from '@/views/home/todos/TodoItemOverview.vue'
  import todoItemApiService from '@/api-services/todo-item-api-service'
  import TodoItemStatusEnum from '@/api-services/models/TodoItemStatusEnum'
  import AddNewTodoItem from './AddNewTodoItem.vue'
  import RefreshIcon from '@/assets/refresh-icon.svg?component'
  import draggable from 'vuedraggable'
  import LexicoGraphicalUtility from '@/common/lexico-string-generator'
  import appStoreService from '@/store/application/applicationStoreService'
  import todoStoreService from './store/todoStoreService'
  import dayjs from 'dayjs'

  export default defineComponent({
    components: {
      TodoItemOverview,
      AddNewTodoItem,
      RefreshIcon,
      draggable,
    },
    props: {},
    data: function () {
      return {
        drag: false,
      }
    },
    computed: {
      dragOptions() {
        return {
          animation: 200,
          disabled: false,
        }
      },
      todoItems() {
        return todoStoreService.state.todoItems
      },
    },
    created: async function () {
      if (!this.todoItems || this.todoItems.length == 0) {
        await this.fetchTodoItems()
      }

      // Fetch new data if outdated for 5mins
      if (todoStoreService.state.todoItemsUpdatedTime) {
        var MILISECONDS_IN_MINUTE = 1000 * 60
        var now = dayjs()
        var updatedTime = dayjs(todoStoreService.state.todoItemsUpdatedTime)
        const diffMinutes = now.diff(updatedTime) / MILISECONDS_IN_MINUTE

        if (diffMinutes > 5) {
          await this.fetchTodoItems()
        }
      }
    },
    methods: {
      addNewTodoItem: async function (todoItem: TodoItemModel) {
        // get the current order of the last item
        const lastItem = this.todoItems.last()

        const nextOrder = LexicoGraphicalUtility.generateMidString(lastItem ? lastItem.itemOrder : '', '')
        todoItem.itemOrder = nextOrder

        var updatedTodoItems = [...this.todoItems]
        updatedTodoItems.push(todoItem)
        todoStoreService.updateTodoItems(updatedTodoItems)

        const response = await todoItemApiService.add(todoItem)

        // Update the todoItem from response
        todoItem.id = response.data.id
      },
      onItemMarkedAsDone() {
        var updatedTodoItems = [...this.todoItems].filter((r) => r.status != TodoItemStatusEnum.Finished)

        todoStoreService.updateTodoItems(updatedTodoItems)
      },
      fetchTodoItems: async function () {
        appStoreService.toggleLoading(true)

        const response = await todoItemApiService.query(TodoItemStatusEnum.Initial).finally(() => {
          appStoreService.toggleLoading(false)
          return null
        })

        if (response) {
          var todoItems = response.data
          todoItems.sort((a, b) => (a.itemOrder > b.itemOrder ? 1 : -1))
          todoStoreService.updateTodoItems(todoItems)
        }
      },
      onDragEnd: async function (evt) {
        const newIndex = evt.newIndex
        const prevItem = newIndex == 0 ? null : this.todoItems[newIndex - 1]
        const nextItem = newIndex == this.todoItems.length - 1 ? null : this.todoItems[newIndex + 1]

        const newOrder = LexicoGraphicalUtility.generateMidString(prevItem ? prevItem.itemOrder : '', nextItem ? nextItem.itemOrder : '')
        const item = this.todoItems[newIndex]
        item.itemOrder = newOrder

        await todoItemApiService.update(item)

        this.drag = false
      },
    },
  })
</script>

<style lang="postcss" scoped>
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
