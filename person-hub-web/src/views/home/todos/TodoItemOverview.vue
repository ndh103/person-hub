<template>
  <div class="border-red-300 border-b-2 py-2 todo-item-overview">
    <svg-image class="inline-block invisible pr-1 handle-icon h-6 w-6" icon="handle-icon.svg"></svg-image>
    <input type="checkbox" class="rounded text-green-500 mr-3" @click="markAsDone()" />
    <span class="font-medium cursor-pointer" :class="{ 'line-through': todoItemOverview.status == 1 }" @click="gotoDetail()">{{ todoItemOverview.title }}</span>
  </div>
</template>

<script lang="ts">
import { PropType } from "vue"
import { Vue } from "vue-property-decorator"
import TodoItemModel from "@/api-services/models/TodoItemModel"
import todoItemApiService from "@/api-services/todo-item-api-service"
import TodoItemStatusEnum from "@/api-services/models/TodoItemStatusEnum"
import SvgImage from "@/components/SvgImage.vue"

const TodoItemOverview = Vue.extend({
  components:{
    SvgImage
  },
  props: {
    todoItemOverview: {
      type: Object as PropType<TodoItemModel>,
    },
  },
  methods: {
    gotoDetail() {
      this.$router.push(`/todos/${this.todoItemOverview.id}`)
    },
    async markAsDone() {
      this.todoItemOverview.status = TodoItemStatusEnum.Finished

      setTimeout(() => {
        this.$emit("onItemMarkedAsDone")
      }, 500)

      await todoItemApiService.update(this.todoItemOverview)
    },
    
  },
})

export default TodoItemOverview
</script>

<style lang="postcss" scoped>
  .todo-item-overview:hover >>> .handle-icon{
    @apply visible;
  }

  /* Not show the handle icon when dragging */
  .dragging >>> .handle-icon{
    @apply invisible !important;
  }
</style>