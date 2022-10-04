<script setup lang="ts">
  import { PropType, ref, nextTick, defineEmits } from 'vue'
  import todoTopicApiService from './api-services/todo-topic-api-service'
  import todoStoreService from './store/todoStoreService'

  import ChervronRightIcon from '@/assets/chervron-right-icon.svg?component'
  import ChervronDownIcon from '@/assets/chervron-down-icon.svg?component'
  import PencilIcon from '@/assets/pencil-icon.svg?component'
  import CloseIcon from '@/assets/close-icon.svg?component'
  import CheckIcon from '@/assets/check-icon.svg?component'
  import TrashIcon from '@/assets/trash-icon.svg?component'
  import TodoTopicModel from './api-services/models/TodoTopicModel'
  import Modal from '@/components/Modal.vue'

  const props = defineProps({
    topic: {
      type: Object as PropType<TodoTopicModel>,
      default: null,
    },
  })

  const emit = defineEmits<{
    (event: 'onToogleExpand', data: boolean)
    (event: 'onTopicRemoved')
  }>()

  const topicNameInput = ref(null)

  const deleteTopicModalRef = ref(null)

  const state = ref({
    isEditMode: false,
    isExpand: true,
    newTopic: '',
  })

  function onDeleteTopicAction() {
    deleteTopicModalRef.value.toggleModal(true)
  }

  async function deleteTopic() {
    var response = await todoTopicApiService.delete(props.topic.id, true)

    if(response){
      todoStoreService.removeTopic(props.topic.id)
      emit('onTopicRemoved')
    }
    deleteTopicModalRef.value.toggleModal(false)
  }

  function cancelDeleteTopic() {
    deleteTopicModalRef.value.toggleModal(false)
  }

  function toggleEditMode() {
    state.value.newTopic = props.topic.name
    state.value.isEditMode = true

    nextTick(() => topicNameInput.value.focus())
  }

  function cancelUpdateTitle() {
    state.value.isEditMode = false
    state.value.newTopic = ''
  }

  function toogleExpand() {
    state.value.isExpand = !state.value.isExpand
    emit('onToogleExpand', state.value.isExpand)
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
    <ChervronDownIcon class="block pr-1 h-5 w-5 mt-[5px] cursor-pointer" :class="[state.isExpand ? 'block' : 'hidden']" @click="toogleExpand()" />
    <ChervronRightIcon class="block pr-1 h-5 w-5 mt-[5px] cursor-pointer" :class="[state.isExpand ? 'hidden' : 'block']" @click="toogleExpand()" />

    <div v-if="!state.isEditMode" class="w-full topic-title-handle cursor-grab" :class="{ 'border-b pb-2': !state.isExpand }">
      <span class="text-lg">{{ topic.name }}</span>
    </div>

    <div v-if="state.isEditMode" class="flex-grow">
      <input ref="topicNameInput" v-model="state.newTopic" type="text" class="app-input w-full" placeholder="Edit topic ..." @keyup.enter="updateTopic()" />
    </div>

    <span v-if="!state.isEditMode" class="flex-grow"></span>

    <div class="flex">
      <TrashIcon v-if="!state.isEditMode" class="mr-2 h-4 w-4 block invisible cursor-pointer action-icon" @click="onDeleteTopicAction()" />
      <PencilIcon v-if="!state.isEditMode" class="h-4 w-4 block invisible cursor-pointer action-icon" @click="toggleEditMode()" />
      <CloseIcon v-if="state.isEditMode" class="mr-2 h-4 w-4 block cursor-pointer" @click="cancelUpdateTitle()" />
      <CheckIcon v-if="state.isEditMode" class="h-4 w-4 block cursor-pointer" @click="updateTopic()" />
    </div>

    <Modal ref="deleteTopicModalRef" title="Confirm deletion">
      <template #body>Delete an topic will unlink all items under this topic. Are you sure? </template>
      <template #footer>
        <div class="mx-4 mb-4 flex flex-row-reverse">
          <button class="app-btn-secondary" @click="cancelDeleteTopic()">Cancel</button>
          <button class="app-btn-danger" @click="deleteTopic()">Delete</button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style lang="postcss" scoped>
  .todo-topic-overview:hover .action-icon {
    @apply visible;
  }
</style>
