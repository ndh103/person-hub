<script setup lang="ts">
  import { onMounted } from 'vue'
  import SunIcon from '@/assets/sun-icon.svg?component'
  import CalendarWeekIcon from '@/assets/calendar-week-icon.svg?component'
  import TodoListIcon from '@/assets/todo-list-icon.svg?component'

  import todoItemApiService from './api-services/todo-item-api-service'
  import todoTopicApiService from './api-services/todo-topic-api-service'
  import TodoItemTypeEnum from './api-services/models/TodoItemTypeEnum'
  import RefreshIcon from '@/assets/refresh-icon.svg?component'
  import todoStoreService from './store/todoStoreService'

  import dayjs from 'dayjs'

  import ItemList from './ItemList.vue'
  import TodoItemModel from './api-services/models/TodoItemModel'
  import { computed } from '@vue/reactivity'
  import TodoTopicModel from './api-services/models/TodoTopicModel'
  import QuickAddTopic from './QuickAddTopic.vue'
  import LexicoGraphicalUtility from '@/common/lexico-string-generator'

  const inboxItems = computed(() => {
    return todoStoreService.state.todoItems.filter((r) => !r.todoTopicId)
  })

  const topicItems = computed(() => {
    var topics: Array<TodoTopicModel> = todoStoreService.state.topics.map((topic) => {
      var returnTopic = { ...topic } as TodoTopicModel
      var topicItems = todoStoreService.state.todoItems.filter((r) => r.todoTopicId == topic.id)
      returnTopic.todoItems = [...topicItems]

      return returnTopic
    })
    
    return topics
  })

  async function addNewTopic(topic: TodoTopicModel) {
    var firstItem = todoStoreService.state.topics[0]

    // In case there is no firstitem, or no oder string, use a default string so order has default value
    var nextOrder = firstItem?.order ? firstItem.order : 'abcd'

    const topicOrder = LexicoGraphicalUtility.generateMidString('', nextOrder)
    topic.order = topicOrder

    const response = await todoTopicApiService.add(topic)

    if (response) {
      var responseTopic = response.data as TodoTopicModel
      todoStoreService.addTopic(responseTopic)
    }
  }

  async function fetchData() {
    await fetchTopics()
    await fetchTodoItems()
  }

  async function fetchTopics() {
    const response = await todoTopicApiService.getAll(true)

    if (response) {
      var responseTopics = response.data as Array<TodoTopicModel>
      responseTopics.sort((a, b) => (a.order > b.order ? 1 : -1))
      todoStoreService.updateTopics(responseTopics)
    }
  }

  async function fetchTodoItems() {
    const response = await todoItemApiService.getAll(true)

    if (response) {
      var responseTodoItems = response.data as Array<TodoItemModel>
      responseTodoItems.sort((a, b) => (a.itemOrder > b.itemOrder ? 1 : -1))
      todoStoreService.updateTodoItems(responseTodoItems)
    }
  }

  onMounted(async () => {
    if (!todoStoreService.state.todoItemsUpdatedTime) {
      await fetchData()
      return
    }

    // Fetch new data if outdated for 5mins
    if (todoStoreService.state.todoItemsUpdatedTime) {
      var MILISECONDS_IN_MINUTE = 1000 * 60
      var now = dayjs()
      var updatedTime = dayjs(todoStoreService.state.todoItemsUpdatedTime)
      const diffMinutes = now.diff(updatedTime) / MILISECONDS_IN_MINUTE

      if (diffMinutes > 5) {
        await fetchData()
      }
    }
  })
</script>

<template>
  <div class="flex flex-row-reverse">
    <span class="hover:cursor-pointer hover:text-emerald-700 text-emerald-500" @click="fetchData()">
      <RefreshIcon class="h-4 w-4 inline-block" />
      Refresh
    </span>
  </div>

  <div class="py-4">
    <div class="flex items-center">
      <span class="text-lg">Inbox</span>
    </div>
    <ItemList :topic-id="null" :items="inboxItems"></ItemList>
  </div>

  <div class="py-4">
    <QuickAddTopic @on-add-new-item="addNewTopic($event)" />
  </div>

  <div class="py-4" v-for="topic in topicItems">
    <div class="flex items-center">
      <span class="text-lg">{{ topic.name }}</span>
    </div>
    <ItemList :topic-id="topic.id" :items="topic.todoItems"></ItemList>
  </div>
</template>
