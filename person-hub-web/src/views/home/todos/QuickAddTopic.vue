<script setup lang="ts">
  import { ref } from 'vue'
  import TodoTopicModel from './api-services/models/TodoTopicModel'

  const emit = defineEmits<{
    (event: 'onAddNewItem', data: TodoTopicModel)
  }>()

  const state = ref({
    newTopic: new TodoTopicModel(),
  })

  async function submitForm() {
    if (!state.value.newTopic.name) {
      return
    }

    emit('onAddNewItem', { ...state.value.newTopic })

    // Reset
    state.value.newTopic.name = ''
  }
</script>

<template>
  <div class="mb-4 flex flex-row items-center">
    <input v-model="state.newTopic.name" type="text" class="app-input flex-grow" placeholder="Add new topic ..." @keyup.enter="submitForm()" />
  </div>
</template>
