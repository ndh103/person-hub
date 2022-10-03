<script setup lang="ts">
  import { PropType, ref, nextTick } from 'vue'
  import todoTopicApiService from './api-services/todo-topic-api-service'
  import HandleIcon from '@/assets/handle-icon.svg?component'
  import PencilIcon from '@/assets/pencil-icon.svg?component'
  import CloseIcon from '@/assets/close-icon.svg?component'
  import CheckIcon from '@/assets/check-icon.svg?component'
  import TodoTopicModel from './api-services/models/TodoTopicModel'

  const props = defineProps({
    topic: {
      type: Object as PropType<TodoTopicModel>,
      default: null,
    },
  })

  const topicNameInput = ref(null)

  const state = ref({
    isEditMode: false,
    newTopic: '',
  })

  function toggleEditMode() {
    state.value.newTopic = props.topic.name
    state.value.isEditMode = true

    nextTick(() => topicNameInput.value.focus())
  }

  function cancelUpdateTitle() {
    state.value.isEditMode = false
    state.value.newTopic = ''
  }

  async function updateTopic() {
    var updatedItem = { ...props.topic }
    updatedItem.name = state.value.newTopic

    var response = await todoTopicApiService.update(updatedItem, true)
    if (response) {
      props.topic.name = state.value.newTopic
    }
    state.value.isEditMode = false
    state.value.newTopic = ''
  }
</script>

<template>
  <div class="todo-topic-overview flex">
    <HandleIcon class="block invisible pr-1 h-5 w-5 mt-[5px]" :class="[state.isEditMode ? 'edit-handle-icon' : 'handle-icon']"></HandleIcon>

    <div v-if="!state.isEditMode">
      <span class="text-lg">{{ topic.name }}</span>
    </div>

    <div v-if="state.isEditMode" class="flex-grow">
      <input ref="topicNameInput" v-model="state.newTopic" type="text" class="app-input w-full" placeholder="Edit topic ..." @keyup.enter="updateTopic()" />
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
        <CheckIcon v-if="state.isEditMode" class="h-4 w-4 block cursor-pointer" @click="updateTopic()" />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
  .todo-topic-overview:hover .handle-icon,
  .todo-topic-overview:hover .action-icon {
    @apply visible;
  }

  /* Not show the handle icon when dragging */
  .dragging .handle-icon {
    @apply invisible !important;
  }
</style>
