<template>
  <div class="border-b border-gray-400 border-opacity-25 py-2 todo-item-overview flex">
    <div>
      <HandleIcon class="inline-block invisible pr-1 handle-icon h-5 w-5"></HandleIcon>
    </div>

    <div>
      <input v-model="isChecked" type="checkbox" class="rounded text-green-500 mr-3 mt-1" @click="markAsDone()" />
    </div>

    <div>
      <span class="font-medium cursor-pointer" :class="{ 'line-through': isChecked }" @click="gotoDetail()">{{ todoItemOverview.title }}</span>
    </div>
  </div>
</template>

<script lang="ts">
  import { PropType } from 'vue'
  import { defineComponent } from 'vue'
  import TodoItemModel from './api-services/models/TodoItemModel'
  import todoItemApiService from './api-services/todo-item-api-service'
  import HandleIcon from '@/assets/handle-icon.svg?component'

  export default defineComponent({
    components: {
      HandleIcon,
    },
    props: {
      todoItemOverview: {
        type: Object as PropType<TodoItemModel>,
        default: null,
      },
    },
    emits: ['onItemMarkedAsDone'],
    data() {
      return {
        isChecked: false,
      }
    },
    methods: {
      gotoDetail() {
        this.$router.push(`/todos/${this.todoItemOverview.id}`)
      },
      async markAsDone() {
        var response = await todoItemApiService.markAsDone(this.todoItemOverview.id)

        if (response) {
          this.$emit('onItemMarkedAsDone')
        } else {
          // Error, reset the checkbox
          this.isChecked = false
        }
      },
    },
  })
</script>

<style lang="postcss" scoped>
  .todo-item-overview:hover .handle-icon {
    @apply visible;
  }

  /* Not show the handle icon when dragging */
  .dragging .handle-icon {
    @apply invisible !important;
  }
</style>
