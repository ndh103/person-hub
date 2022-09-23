<template>
  <div class="flex flex-row-reverse">
    <span class="hover:cursor-pointer hover:text-emerald-700 text-emerald-500" @click="fetchTodoItems()">
      <RefreshIcon class="h-4 w-4 inline-block" />
      Refresh
    </span>
  </div>
  <div class="py-4">
    <div class="flex items-center">
      <SunIcon class="inline-block h-4 w-4 mr-2" />
      <span class="text-lg"> Your Day</span>
    </div>
    <ItemList :items="yourDayItems" :item-type="TodoItemTypeEnum.YourDay"></ItemList>
  </div>

  <div class="py-4">
    <div class="flex items-center">
      <CalendarWeekIcon class="inline-block h-3 w-3 mr-2" />
      <span class="text-lg"> Your Week</span>
    </div>
    <ItemList :items="yourWeekItems" :item-type="TodoItemTypeEnum.YourWeek"></ItemList>
  </div>

  <div class="py-4">
    <div class="flex items-center">
      <TodoListIcon class="inline-block h-4 w-4 mr-2" />
      <span class="text-lg"> Todos</span>
    </div>
    <ItemList :items="todoItems" :item-type="TodoItemTypeEnum.Todo"></ItemList>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import SunIcon from '@/assets/sun-icon.svg?component'
  import CalendarWeekIcon from '@/assets/calendar-week-icon.svg?component'
  import TodoListIcon from '@/assets/todo-list-icon.svg?component'

  import todoItemApiService from './api-services/todo-item-api-service'
  import TodoItemStatusEnum from './api-services/models/TodoItemStatusEnum'
  import TodoItemTypeEnum from './api-services/models/TodoItemTypeEnum'
  import appStoreService from '@/store/application/applicationStoreService'
  import RefreshIcon from '@/assets/refresh-icon.svg?component'
  import todoStoreService from './store/todoStoreService'

  import dayjs from 'dayjs'

  import ItemList from './ItemList.vue'
  import TodoItemModel from './api-services/models/TodoItemModel'

  export default defineComponent({
    components: {
      ItemList,
      RefreshIcon,
      SunIcon,
      CalendarWeekIcon,
      TodoListIcon,
    },
    computed: {
      todoItems() {
        return todoStoreService.state.todoItems.filter((r) => r.type == TodoItemTypeEnum.Todo)
      },
      yourDayItems() {
        return todoStoreService.state.todoItems.filter((r) => r.type == TodoItemTypeEnum.YourDay)
      },
      yourWeekItems() {
        return todoStoreService.state.todoItems.filter((r) => r.type == TodoItemTypeEnum.YourWeek)
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
          var todoItems = response.data as Array<TodoItemModel>
          todoItems.sort((a, b) => (a.itemOrder > b.itemOrder ? 1 : -1))
          todoStoreService.updateTodoItems(todoItems)
        }
      },
    },
  })
</script>
