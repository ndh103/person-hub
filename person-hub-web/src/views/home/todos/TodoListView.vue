<script setup lang="ts">
  import { onMounted, watch } from 'vue'
  import draggable from 'vuedraggable'

  import todoItemApiService from './api-services/todo-item-api-service'
  import todoTopicApiService from './api-services/todo-topic-api-service'
  import RefreshIcon from '@/assets/refresh-icon.svg?component'
  import todoStoreService from './store/todoStoreService'
  import HandleIcon from '@/assets/handle-icon.svg?component'

  import dayjs from 'dayjs'

  import ItemList from './ItemList.vue'
  import TodoItemModel from './api-services/models/TodoItemModel'
  import { computed, ref } from '@vue/reactivity'
  import TodoTopicModel from './api-services/models/TodoTopicModel'
  import QuickAddTopic from './QuickAddTopic.vue'
  import LexicoGraphicalUtility from '@/common/lexico-string-generator'
  import TodoTopicSection from './TodoTopicSection.vue'

  const inboxItems = computed(() => {
    return todoStoreService.state.todoItems.filter((r) => !r.todoTopicId)
  })

  const computedTopicItems = computed(() => {
    var topics: Array<TodoTopicModel> = todoStoreService.state.topics.map((topic) => {
      var returnTopic = { ...topic } as TodoTopicModel
      var topicItems = todoStoreService.state.todoItems.filter((r) => r.todoTopicId == topic.id)
      returnTopic.todoItems = [...topicItems]

      return returnTopic
    })

    return topics
  })

  const state = ref({
    drag: false,
    // Since we have drag/and drop, cannot directly use computed property, use state instead
    topicItems: new Array<TodoTopicModel>()
  })

  // Update the state.topicItems when the computed value changed
  watch(computedTopicItems, async (newItems, oldItems) => {
    state.value.topicItems = cloneAndSort(newItems)
  })

  function cloneAndSort(items: Array<TodoTopicModel>) {
    var cloneItems = [...items]
    cloneItems.sort((a, b) => (a.order > b.order ? 1 : -1))
    return cloneItems
  }

  const dragOptions = computed(() => {
    return {
      animation: 200,
      disabled: false,
    }
  })

  async function addNewTopic(topic: TodoTopicModel) {
    var firstItem = todoStoreService.state.topics[0]

    // In case there is no firstitem, or no oder string, use a default string so order has default value
    var nextOrder = firstItem?.order ? firstItem.order : 'abcd'

    const topicOrder = LexicoGraphicalUtility.generateMidString('', nextOrder)
    topic.order = topicOrder

    const response = await todoTopicApiService.add(topic, true)

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

  async function onDragEnd(evt) {
    const newIndex = evt.newIndex
    // Target Item List have the updated list after the item is dropped
    var targetItemList = evt.to.__draggable_component__.componentStructure.realList
    var dropItem = evt.from.__draggable_component__.context.element as TodoTopicModel

    // Find the dropped item in the target list, clone the item to not directly make changes to the item
    var topicItem = { ...targetItemList.find((r) => r.id == dropItem.id) } as TodoTopicModel

    const prevItem = newIndex == 0 ? null : targetItemList[newIndex - 1]
    const nextItem = newIndex == targetItemList.length - 1 ? null : targetItemList[newIndex + 1]
    const newOrder = LexicoGraphicalUtility.generateMidString(prevItem ? prevItem.order : '', nextItem ? nextItem.order : '')

    topicItem.order = newOrder

    // // Call api to update
    await todoTopicApiService.update(topicItem)

    // Call store to reorder the item, the list will be sorted correctly because now the dropped item has been updated with new Order
    todoStoreService.reorderTopic(topicItem)

    state.value.drag = false
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
      <!-- Keep the handle icon invisible here is a trick to make the Inbox align well with other topics -->
      <HandleIcon class="inline-block invisible pr-1 h-5 w-5" />
      <span class="text-lg">Inbox</span>
    </div>
    <ItemList class="pl-8" :topic-id="null" :items="inboxItems"></ItemList>
  </div>

  <div class="py-4">
    <QuickAddTopic class="pl-4" @on-add-new-item="addNewTopic($event)" />
  </div>

  <draggable
    v-model="state.topicItems"
    item-key="id"
    v-bind="dragOptions"
    handle=".handle-icon"
    :class="{ 'topic-dragging': state.drag, 'topic-no-drag': !state.drag }"
    @start="state.drag = true"
    @end="onDragEnd($event)"
    group="todoTopics"
  >
    <template #item="{ element }">
      <transition name="slide-fade">
        <TodoTopicSection :topic="element"></TodoTopicSection>
      </transition>
    </template>
  </draggable>
</template>

<style lang="postcss" scoped>
  .todo-topic:hover .handle-icon,
  .todo-topic:hover .action-icon {
    @apply visible;
  }

  /* Not show the handle icon when dragging */
  .topic-dragging .handle-icon {
    @apply invisible !important;
  }
</style>
