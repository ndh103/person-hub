<template>
  <div class="border-b border-gray-400 border-opacity-25 py-2 todo-item-overview">
    <HandleIcon class="inline-block invisible pr-1 handle-icon h-6 w-6"></HandleIcon>
    <input type="checkbox" class="rounded text-green-500 mr-3" @click="markAsDone()" />
    <span class="font-medium cursor-pointer" :class="{ 'line-through': todoItemOverview.status == 1 }" @click="gotoDetail()">{{ todoItemOverview.title }}</span>
  </div>
</template>

<script lang="ts">
  import { PropType } from 'vue'
  import { defineComponent } from 'vue'
  import TodoItemModel from '@/api-services/models/TodoItemModel'
  import todoItemApiService from '@/api-services/todo-item-api-service'
  import TodoItemStatusEnum from '@/api-services/models/TodoItemStatusEnum'
  import HandleIcon from '@/assets/handle-icon.svg?component'

  export default defineComponent({
    components: {
      HandleIcon,
    },
    props: {
      todoItemOverview: {
        type: Object as PropType<TodoItemModel>,
      },
    },
    emits: ['onItemMarkedAsDone'],
    methods: {
      gotoDetail() {
        this.$router.push(`/todos/${this.todoItemOverview.id}`)
      },
      async markAsDone() {
        // TODO: understand and solve this
        // eslint-disable-next-line vue/no-mutating-props
        this.todoItemOverview.status = TodoItemStatusEnum.Finished

        setTimeout(() => {
          this.$emit('onItemMarkedAsDone')
        }, 500)

        await todoItemApiService.update(this.todoItemOverview)
      },
    },
  })
</script>

<style lang="postcss" scoped>
  .todo-item-overview:hover >>> .handle-icon {
    @apply visible;
  }

  /* Not show the handle icon when dragging */
  .dragging >>> .handle-icon {
    @apply invisible !important;
  }
</style>
