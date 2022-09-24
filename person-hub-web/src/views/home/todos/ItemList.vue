<script setup lang="ts">
  import TodoItemModel from './api-services/models/TodoItemModel'
  import TodoItemOverview from '@/views/home/todos/TodoItemOverview.vue'
  import todoItemApiService from './api-services/todo-item-api-service'
  import QuickAdd from './QuickAdd.vue'
  import draggable from 'vuedraggable'
  import LexicoGraphicalUtility from '@/common/lexico-string-generator'
  import todoStoreService from './store/todoStoreService'
  import TodoItemTypeEnum from './api-services/models/TodoItemTypeEnum'
  import TodoItemStatusEnum from './api-services/models/TodoItemStatusEnum'
  import { computed, ref } from '@vue/reactivity'
  import { onMounted, PropType, watch } from 'vue'

  const { items, itemType } = defineProps({
    items: {
      type: Array as PropType<Array<TodoItemModel>>,
      default: new Array<TodoItemModel>(),
    },
    itemType: {
      type: Number as PropType<TodoItemTypeEnum>,
      default: TodoItemTypeEnum.Todo,
    },
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

  watch(items, async (newItems, oldItems) => {
    state.value.todoItems = [...newItems]
  })

  onMounted(() => {
    state.value.todoItems = [...items]
  })

  async function addNewTodoItem(todoItem: TodoItemModel) {
    // get the current order of the last item
    const lastItem = state.value.todoItems.last()

    const nextOrder = LexicoGraphicalUtility.generateMidString(lastItem ? lastItem.itemOrder : '', '')
    todoItem.itemOrder = nextOrder

    //temporary added to the list (before calling api)
    state.value.todoItems.push(todoItem)

    const response = await todoItemApiService.add(todoItem)

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
    const newIndex = evt.newIndex
    const prevItem = newIndex == 0 ? null : state.value.todoItems[newIndex - 1]
    const nextItem = newIndex == state.value.todoItems.length - 1 ? null : state.value.todoItems[newIndex + 1]

    const newOrder = LexicoGraphicalUtility.generateMidString(prevItem ? prevItem.itemOrder : '', nextItem ? nextItem.itemOrder : '')
    const item = state.value.todoItems[newIndex]
    item.itemOrder = newOrder

    await todoItemApiService.update(item)

    state.value.drag = false
  }
</script>

<template>
  <div>
    <quick-add :item-type="itemType" @onAddNewItem="addNewTodoItem($event)"></quick-add>

    <draggable
      v-model="state.todoItems"
      item-key="id"
      v-bind="dragOptions"
      handle=".handle-icon"
      :class="{ dragging: state.drag, 'no-drag': !state.drag }"
      @start="state.drag = true"
      @end="onDragEnd($event)"
    >
      <template #item="{ element }">
        <transition name="slide-fade">
          <todo-item-overview v-show="element.status != 1" :todo-item-overview="element" @onItemMarkedAsDone="onItemMarkedAsDone(element)"></todo-item-overview>
        </transition>
      </template>
    </draggable>
  </div>
</template>

<style lang="postcss" scoped>
  .slide-fade-enter-active {
    transition: all 0.3s ease;
  }
  .slide-fade-leave-active {
    transition: all 0.5s cubic-bezier(1, 0.5, 0.8, 1);
  }
  .slide-fade-enter, .slide-fade-leave-to
  {
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
