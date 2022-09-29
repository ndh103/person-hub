<script setup lang="ts">
  import { PropType, ref, nextTick } from 'vue'
  import TodoItemModel from './api-services/models/TodoItemModel'
  import todoItemApiService from './api-services/todo-item-api-service'
  import HandleIcon from '@/assets/handle-icon.svg?component'
  import PencilIcon from '@/assets/pencil-icon.svg?component'
  import CloseIcon from '@/assets/close-icon.svg?component'
  import CheckIcon from '@/assets/check-icon.svg?component'

  const emit = defineEmits<{
    (e: 'onItemMarkedAsDone'): void
  }>()

  const { todoItemOverview } = defineProps({
    todoItemOverview: {
      type: Object as PropType<TodoItemModel>,
      default: null,
    },
  })

  const titleInput = ref(null)

  const state = ref({
    isChecked: false,
    isEditMode: false,
    newTitle: '',
  })

  function toggleEditMode() {
    state.value.newTitle = todoItemOverview.title
    state.value.isEditMode = true

    nextTick(() => titleInput.value.focus())
  }

  async function markAsDone() {
    var response = await todoItemApiService.markAsDone(todoItemOverview.id)

    if (response) {
      emit('onItemMarkedAsDone')
    } else {
      // Error, reset the checkbox
      state.value.isChecked = false
    }
  }

  function cancelUpdateTitle() {
    state.value.isEditMode = false
    state.value.newTitle = ''
  }

  async function updateTitle() {
    var updatedItem = { ...todoItemOverview }
    updatedItem.title = state.value.newTitle

    var response = await todoItemApiService.update(updatedItem, true)
    if (response) {
      // eslint-disable-next-line vue/no-mutating-props
      todoItemOverview.title = state.value.newTitle
    }
    state.value.isEditMode = false
    state.value.newTitle = ''
  }

  function isValidHttpUrl(string) {
    let url

    try {
      url = new URL(string)
    } catch (_) {
      return false
    }

    return url.protocol === 'http:' || url.protocol === 'https:'
  }
</script>

<template>
  <div class="border-b border-gray-400 border-opacity-25 py-2 todo-item-overview flex">
    <div>
      <HandleIcon class="inline-block invisible pr-1 h-5 w-5" :class="[state.isEditMode ? 'edit-handle-icon' : 'handle-icon']"></HandleIcon>
    </div>

    <div>
      <input v-if="!state.isEditMode" v-model="state.isChecked" type="checkbox" class="rounded text-emerald-500 mr-3 mt-1" @click="markAsDone()" />
    </div>

    <div v-if="!state.isEditMode">
      <span>{{todoItemOverview.itemOrder}} - </span>
      <a v-if="isValidHttpUrl(todoItemOverview.title)" class="cursor-pointer italic" :class="{ 'line-through': state.isChecked }" :href="todoItemOverview.title" target="_blank">{{
        todoItemOverview.title
      }}</a>
      <span v-else :class="{ 'line-through': state.isChecked }">{{ todoItemOverview.title }}</span>
    </div>

    <div v-if="state.isEditMode" class="flex-grow">
      <input ref="titleInput" v-model="state.newTitle" type="text" class="app-input w-full" placeholder="Input and press enter to add new ..." @keyup.enter="updateTitle()" />
    </div>

    <span v-if="!state.isEditMode" class="flex-grow"></span>

    <div class="flex">
      <div>
        <PencilIcon v-if="!state.isEditMode" class="h-4 w-4 block invisible cursor-pointer action-icon" @click="toggleEditMode()" />
      </div>
      <div class="pr-2">
        <CloseIcon v-if="state.isEditMode" class="h-4 w-4 block cursor-pointer" @click="cancelUpdateTitle()" />
      </div>
      <div>
        <CheckIcon v-if="state.isEditMode" class="h-4 w-4 block cursor-pointer" @click="updateTitle()" />
      </div>
    </div>
  </div>
</template>

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
