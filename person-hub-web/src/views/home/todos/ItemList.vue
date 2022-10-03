<script setup lang="ts">
  import TodoItemModel from './api-services/models/TodoItemModel'
  import TodoItemOverview from '@/views/home/todos/TodoItemOverview.vue'
  import todoItemApiService from './api-services/todo-item-api-service'
  import QuickAdd from './QuickAdd.vue'
  import draggable from 'vuedraggable'
  import LexicoGraphicalUtility from '@/common/lexico-string-generator'
  import todoStoreService from './store/todoStoreService'
  import TodoItemStatusEnum from './api-services/models/TodoItemStatusEnum'
  import { computed, ref, toRefs } from '@vue/reactivity'
  import { onMounted, PropType, watch } from 'vue'

  const props = defineProps({
    topicId: {
      type: Number,
      default: null,
    },
    items: {
      type: Array as PropType<Array<TodoItemModel>>,
      default: new Array<TodoItemModel>(),
    },
    isExpand: {
      type: Boolean,
      default: true
    }
  })

  const state = ref({
    drag: false,
    todoItems: new Array<TodoItemModel>(),
  })

  const dragOptions = computed(() => {
    return {
      animation: 200,
      disabled: false,
    }
  })

  // watch for items by first using toRefs
  var itemsRef = toRefs(props).items
  watch(itemsRef, async (newItems, oldItems) => {
    state.value.todoItems = cloneAndSort(newItems)
  })

  onMounted(() => {
    state.value.todoItems = cloneAndSort(props.items)
  })

  function cloneAndSort(items: Array<TodoItemModel>) {
    var cloneItems = [...items]
    cloneItems.sort((a, b) => (a.itemOrder > b.itemOrder ? 1 : -1))
    return cloneItems
  }

  async function addNewTodoItem(todoItem: TodoItemModel) {
    // get the current order of the last item
    const lastItem = state.value.todoItems.last()

    const nextOrder = LexicoGraphicalUtility.generateMidString(lastItem ? lastItem.itemOrder : '', '')
    todoItem.itemOrder = nextOrder

    //temporary added to the list (before calling api)
    state.value.todoItems.push(todoItem)

    const response = await todoItemApiService.add(todoItem, true)

    if (response) {
      // Update the todoItem from response
      todoItem.id = (response.data as TodoItemModel).id
      todoStoreService.addTodoItem(todoItem)
    } else {
      // in case of error, remove the item out of the list
      var index = state.value.todoItems.findIndex((r) => r.itemOrder == todoItem.itemOrder)
      state.value.todoItems.splice(index, 1)
    }
  }

  function onItemMarkedAsDone(todoItem: TodoItemModel) {
    todoItem.status = TodoItemStatusEnum.Finished

    setTimeout(() => {
      todoStoreService.removeTodoItem(todoItem.id)
    }, 500)
  }

  async function onDragEnd(evt) {
    // Get the topicId from the attribute of the parent of the "to" node
    let parentNode = evt.to.parentNode as any
    let topicId = parentNode.getAttributeNode('topic-id')?.value

    const newIndex = evt.newIndex
    // Target Item List have the updated list after the item is dropped
    var targetItemList = evt.to.__draggable_component__.componentStructure.realList
    var dropItem = evt.from.__draggable_component__.context.element as TodoItemModel

    // Find the dropped item in the target list, clone the item to not directly make changes to the item
    var item = { ...targetItemList.find((r) => r.id == dropItem.id) }

    const prevItem = newIndex == 0 ? null : targetItemList[newIndex - 1]
    const nextItem = newIndex == targetItemList.length - 1 ? null : targetItemList[newIndex + 1]
    const newOrder = LexicoGraphicalUtility.generateMidString(prevItem ? prevItem.itemOrder : '', nextItem ? nextItem.itemOrder : '')

    item.todoTopicId = topicId
    item.itemOrder = newOrder

    // Call api to update
    await todoItemApiService.update(item)

    // Call store to reorder the item, the list will be sorted correctly because now the dropped item has been updated with new Order
    todoStoreService.reorderTodoItem(item)

    state.value.drag = false
  }
</script>

<template>
  <div>
    <quick-add :topic-id="topicId" @onAddNewItem="addNewTodoItem($event)" :class="{'hidden': !props.isExpand }"></quick-add>

    <div :topic-id="topicId?.toString()" :class="{'hidden': !props.isExpand }">
      <draggable
        v-model="state.todoItems"
        item-key="id"
        v-bind="dragOptions"
        handle=".handle-icon"
        :class="{ dragging: state.drag, 'no-drag': !state.drag }"
        @start="state.drag = true"
        @end="onDragEnd($event)"
        group="todoItems"
      >
        <template #item="{ element }">
          <transition name="slide-fade">
            <todo-item-overview v-show="element.status != 1" :todo-item-overview="element" @onItemMarkedAsDone="onItemMarkedAsDone(element)"></todo-item-overview>
          </transition>
        </template>
      </draggable>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
  .slide-fade-enter-active {
    transition: all 0.3s ease;
  }
  .slide-fade-leave-active {
    transition: all 0.5s cubic-bezier(1, 0.5, 0.8, 1);
  }
  .slide-fade-enter,
  .slide-fade-leave-to {
    transform: translateX(10px);
    opacity: 0;
  }

  /* Style for the item being drag */
  .sortable-drag {
    @apply bg-gray-300;
  }

  /* Style for ghost, the preview item in the drop position */
  .sortable-ghost {
    @apply opacity-50 bg-gray-300;
  }
</style>
