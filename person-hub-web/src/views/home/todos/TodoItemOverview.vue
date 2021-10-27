<template>
  <div class="border-b border-gray-400 border-opacity-25 py-2 todo-item-overview flex">
    <div>
      <HandleIcon class="inline-block invisible pr-1 handle-icon h-5 w-5"></HandleIcon>
    </div>

    <div>
      <input v-model="isChecked" type="checkbox" class="rounded text-green-500 mr-3 mt-1" @click="markAsDone()" />
    </div>

    <div v-if="!isEditMode">
      <a
        v-if="isValidHttpUrl(todoItemOverview.title)"
        class="font-medium cursor-pointer italic"
        :class="{ 'line-through': isChecked }"
        :href="todoItemOverview.title"
        target="_blank"
        >{{ todoItemOverview.title }}</a
      >
      <span v-else class="font-medium" :class="{ 'line-through': isChecked }">{{ todoItemOverview.title }}</span>
    </div>

    <div v-if="isEditMode" class="flex-grow">
      <input ref="titleInput" v-model="newTitle" type="text" class="app-input w-full" placeholder="Input and press enter to add new ..." @keyup.enter="updateTitle()" />
    </div>

    <span v-if="!isEditMode" class="flex-grow"></span>

    <div class="flex">
      <div>
        <PencilIcon v-if="!isEditMode" class="h-4 w-4 block invisible cursor-pointer action-icon" @click="toggleEditMode()" />
      </div>
      <div class="pr-2">
        <CloseIcon v-if="isEditMode" class="h-4 w-4 block invisible cursor-pointer action-icon" @click="cancelUpdateTitle()" />
      </div>
      <div>
        <SaveIcon v-if="isEditMode" class="h-4 w-4 block invisible cursor-pointer action-icon" @click="updateTitle()" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import { PropType } from 'vue'
  import { defineComponent } from 'vue'
  import TodoItemModel from './api-services/models/TodoItemModel'
  import todoItemApiService from './api-services/todo-item-api-service'
  import HandleIcon from '@/assets/handle-icon.svg?component'
  import PencilIcon from '@/assets/pencil-icon.svg?component'
  import SaveIcon from '@/assets/save-icon.svg?component'
  import CloseIcon from '@/assets/close-icon.svg?component'

  export default defineComponent({
    components: {
      HandleIcon,
      PencilIcon,
      SaveIcon,
      CloseIcon,
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
        isEditMode: false,
        newTitle: '',
      }
    },
    methods: {
      gotoDetail() {
        this.$router.push(`/todos/${this.todoItemOverview.id}`)
      },
      toggleEditMode() {
        this.newTitle = this.todoItemOverview.title
        this.isEditMode = true

        this.$nextTick(() => this.$refs.titleInput.focus())
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
      cancelUpdateTitle() {
        this.isEditMode = false
        this.newTitle = ''
      },
      async updateTitle() {
        var updatedItem = { ...this.todoItemOverview }
        updatedItem.title = this.newTitle

        var response = await todoItemApiService.update(updatedItem, true)
        if (response) {
          // eslint-disable-next-line vue/no-mutating-props
          this.todoItemOverview.title = this.newTitle
        }
        this.isEditMode = false
        this.newTitle = ''
      },
      isValidHttpUrl(string) {
        let url

        try {
          url = new URL(string)
        } catch (_) {
          return false
        }

        return url.protocol === 'http:' || url.protocol === 'https:'
      },
    },
  })
</script>

<style lang="postcss" scoped>
  .todo-item-overview:hover .handle-icon,
  .todo-item-overview:hover .action-icon {
    @apply visible;
  }

  /* Not show the handle icon when dragging */
  .dragging .handle-icon {
    @apply invisible !important;
  }
</style>
