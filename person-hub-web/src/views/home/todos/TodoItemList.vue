<template>
  <div>
    <add-new-todo-item
      @onAddNewItem="addNewTodoItem($event)"
    ></add-new-todo-item>
    <button
      class="
        block
        w-auto
        bg-purple-500
        hover:bg-purple-700
        rounded-lg
        shadow-xl
        text-white
        py-2
        px-4
        mx-2
        mt-2
      "
      @click="fetchTodoItems()"
    >
      Refresh <RefreshIcon class="h-2 w-2 inline-block"></RefreshIcon>
    </button>

    <draggable
      v-model="todoItemList"
      item-key="id"
      v-bind="dragOptions"
      handle=".handle-icon"
      :class="{ dragging: drag, 'no-drag': !drag }"
      @start="drag = true"
      @end="onDragEnd($event)"
    >
      <template #item="{ element }">
        <transition name="slide-fade">
          <todo-item-overview
            v-show="element.status != 1"
            :todo-item-overview="element"
            @onItemMarkedAsDone="onItemMarkedAsDone()"
          ></todo-item-overview>
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
  import { mapMutations } from 'vuex'
  import AppStoreConstant from '@/store/application/application-store-constant.ts'

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
        todoItemList: [] as TodoItemModel[],
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
    },
    created: async function () {
      await this.fetchTodoItems()
    },
    methods: {
      ...mapMutations('application', {
        toggleLoading: AppStoreConstant.MUTATIONS.toggleLoading,
      }),
      addNewTodoItem: async function (todoItem: TodoItemModel) {
        // get the current order of the last item
        const lastItem = this.todoItemList.last()

        const nextOrder = LexicoGraphicalUtility.generateMidString(
          lastItem ? lastItem.itemOrder : '',
          ''
        )
        todoItem.itemOrder = nextOrder

        this.todoItemList.push(todoItem)

        const response = await todoItemApiService.add(todoItem)

        // Update the todoItem from response
        todoItem.id = response.data.id
      },
      onItemMarkedAsDone() {
        this.todoItemList = this.todoItemList.filter(
          (r) => r.status != TodoItemStatusEnum.Finished
        )
      },
      fetchTodoItems: async function () {
        this.toggleLoading(true)

        const response = await todoItemApiService
          .query(TodoItemStatusEnum.Initial)
          .finally(() => {
            this.toggleLoading(false)
          })
        this.todoItemList = response.data
        this.todoItemList.sort((a, b) => (a.itemOrder > b.itemOrder ? 1 : -1))
      },
      onDragEnd: async function (evt) {
        const newIndex = evt.newIndex
        const prevItem = newIndex == 0 ? null : this.todoItemList[newIndex - 1]
        const nextItem =
          newIndex == this.todoItemList.length - 1
            ? null
            : this.todoItemList[newIndex + 1]

        const newOrder = LexicoGraphicalUtility.generateMidString(
          prevItem ? prevItem.itemOrder : '',
          nextItem ? nextItem.itemOrder : ''
        )
        const item = this.todoItemList[newIndex]
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
