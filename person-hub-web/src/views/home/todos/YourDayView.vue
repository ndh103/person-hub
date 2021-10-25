<template>
  <div class="flex flex-row-reverse">
    <span class="hover:cursor-pointer hover:text-green-700 text-green-500 mb-4" @click="fetchTodoItems()">
      <RefreshIcon class="h-4 w-4 inline-block" />
      Refresh
    </span>
  </div>
  <div class="py-4">
    <span class="text-lg block">Your Day</span>
    <ItemList :items="yourDayItems" :item-type="TodoItemTypeEnum.YourDay"></ItemList>
  </div>

  <div class="py-4">
    <span class="text-lg block">Todos</span>
    <ItemList :items="todoItems" :item-type="TodoItemTypeEnum.Todo"></ItemList>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import todoItemApiService from './api-services/todo-item-api-service'
  import TodoItemStatusEnum from './api-services/models/TodoItemStatusEnum'
  import TodoItemTypeEnum from './api-services/models/TodoItemTypeEnum'
  import appStoreService from '@/store/application/applicationStoreService'
  import RefreshIcon from '@/assets/refresh-icon.svg?component'
  import todoStoreService from './store/todoStoreService'

  import dayjs from 'dayjs'

  import ItemList from './ItemList.vue'

  export default defineComponent({
    components: {
      ItemList,
      RefreshIcon,
    },
    computed: {
      todoItems() {
        return todoStoreService.state.todoItems.filter((r) => r.type == TodoItemTypeEnum.Todo)
      },
      yourDayItems() {
        return todoStoreService.state.todoItems.filter((r) => r.type == TodoItemTypeEnum.YourDay)
      },
      TodoItemTypeEnum() {
        return TodoItemTypeEnum
      },
    },
    created: async function () {
      if (!todoStoreService.state.todoItemsUpdatedTime) {
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
    },
  })
</script>
