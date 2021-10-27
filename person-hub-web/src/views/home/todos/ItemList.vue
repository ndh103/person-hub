<template>
  <div>
    <quick-add :item-type="itemType" @onAddNewItem="addNewTodoItem($event)"></quick-add>

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
          <todo-item-overview v-show="element.status != 1" :todo-item-overview="element" @onItemMarkedAsDone="onItemMarkedAsDone(element)"></todo-item-overview>
        </transition>
      </template>
    </draggable>
  </div>
</template>

<script lang="ts">
  import { defineComponent, PropType } from 'vue'
  import TodoItemModel from './api-services/models/TodoItemModel'
  import TodoItemOverview from '@/views/home/todos/TodoItemOverview.vue'
  import todoItemApiService from './api-services/todo-item-api-service'
  import QuickAdd from './QuickAdd.vue'
  import draggable from 'vuedraggable'
  import LexicoGraphicalUtility from '@/common/lexico-string-generator'
  import todoStoreService from './store/todoStoreService'
  import TodoItemTypeEnum from './api-services/models/TodoItemTypeEnum'
  import TodoItemStatusEnum from './api-services/models/TodoItemStatusEnum'

  export default defineComponent({
    components: {
      TodoItemOverview,
      QuickAdd,
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
        todoItems: new Array<TodoItemModel>(),
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
    watch: {
      items: function () {
        this.todoItems = [...this.items]
      },
    },
    created() {
      this.todoItems = [...this.items]
    },
    methods: {
      addNewTodoItem: async function (todoItem: TodoItemModel) {
        // get the current order of the last item
        const lastItem = this.todoItems.last()

        const nextOrder = LexicoGraphicalUtility.generateMidString(lastItem ? lastItem.itemOrder : '', '')
        todoItem.itemOrder = nextOrder

        //temporary added to the list (before calling api)
        this.todoItems.push(todoItem)

        const response = await todoItemApiService.add(todoItem)

        if (response) {
          // Update the todoItem from response
          todoItem.id = (response.data as TodoItemModel).id
          todoStoreService.addTodoItem(todoItem)
        } else {
          // in case of error, remove the item out of the list
          var index = this.todoItems.findIndex((r) => r.itemOrder == todoItem.itemOrder)
          this.todoItems.splice(index, 1)
        }
      },
      onItemMarkedAsDone(todoItem: TodoItemModel) {
        todoItem.status = TodoItemStatusEnum.Finished

        setTimeout(() => {
          todoStoreService.removeTodoItem(todoItem.id)
        }, 500)
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
