<template>
  <div>
    <add-new-todo-item @onAddNewItem="addNewTodoItem($event)"></add-new-todo-item>

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
  import { defineComponent, PropType } from 'vue'
  import TodoItemModel from '@/api-services/models/TodoItemModel'
  import TodoItemOverview from '@/views/home/todos/TodoItemOverview.vue'
  import todoItemApiService from '@/api-services/todo-item-api-service'
  import TodoItemStatusEnum from '@/api-services/models/TodoItemStatusEnum'
  import AddNewTodoItem from './AddNewTodoItem.vue'
  import draggable from 'vuedraggable'
  import LexicoGraphicalUtility from '@/common/lexico-string-generator'
  import todoStoreService from './store/todoStoreService'
  import TodoItemTypeEnum from '@/api-services/models/TodoItemTypeEnum'

  export default defineComponent({
    components: {
      TodoItemOverview,
      AddNewTodoItem,
      draggable,
    },
    props: {
      items: {
        type: Array as PropType<Array<TodoItemModel>>,
        default: new Array<TodoItemModel>(),
      },
      itemType: {
        type: Number as PropType<TodoItemTypeEnum>,
        default: TodoItemTypeEnum.Todo,
      },
    },
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
        return this.items
      },
    },
    methods: {
      addNewTodoItem: async function (todoItem: TodoItemModel) {
        todoItem.type = this.itemType

        // get the current order of the last item
        const lastItem = this.todoItems.last()

        const nextOrder = LexicoGraphicalUtility.generateMidString(lastItem ? lastItem.itemOrder : '', '')
        todoItem.itemOrder = nextOrder

        const response = await todoItemApiService.add(todoItem)

        if (response) {
          // Update the todoItem from response
          todoItem.id = response.data.id
          todoStoreService.addTodoItem(todoItem)
        }
      },
      onItemMarkedAsDone() {
        var updatedTodoItems = [...this.todoItems].filter((r) => r.status != TodoItemStatusEnum.Finished)

        todoStoreService.updateTodoItems(updatedTodoItems)
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
