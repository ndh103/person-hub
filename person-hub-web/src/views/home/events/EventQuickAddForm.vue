<script setup lang="ts">
  import { defineExpose, defineEmits, onMounted, ref } from 'vue'
  import EventModel from './api-services/models/EventModel'
  import VueTagsInput from '@sipec/vue3-tags-input'

  const emit = defineEmits<{
    (event: 'onNewEventAdded', data: EventModel)
  }>()

  const state = ref({
    event: new EventModel(),
    isFormOpen: false,
    tag: '',
    tags: [],
  })

  function submit() {
    state.value.event.tags = state.value.tags.map((r) => r.text)

    //TODO: validate the event here
    emit('onNewEventAdded', { ...state.value.event })

    state.value.isFormOpen = false
  }

  function openForm() {
    state.value.isFormOpen = true
    resetForm()
  }

  function discardForm() {
    state.value.isFormOpen = false
    resetForm()
  }

  function resetForm() {
    state.value.event = new EventModel()
    state.value.event.eventDate = new Date()
    state.value.tag = ''
    state.value.tags = []
  }

  function dateSelected(e, toogleFunc) {
    toogleFunc({ ref: e.target })
  }

  onMounted(() => {
    state.value.event.eventDate = new Date()
  })

  defineExpose({
    openForm,
  })
</script>

<template>
  <div class="px-2 pb-6">
    <div v-if="state.isFormOpen" class="p-2 border border-gray-400 px-4 rounded border-opacity-50">
      <div class="pb-2 flex flex-row w-full">
        <input v-model="state.event.title" type="text" placeholder="Title" class="app-input w-full" />
      </div>

      <div class="pb-2 flex flex-row w-full">
        <textarea v-model="state.event.description" type="text" placeholder="Description" class="app-input w-full" />
      </div>

      <div class="pb-2 flex flex-row w-full">
        <v-date-picker v-model="state.event.eventDate">
          <template #default="{ togglePopover }">
            <div class="flex flex-wrap">
              <button class="app-btn-datepicker" @click.stop="dateSelected($event, togglePopover)">
                {{ state.event.eventDate.toLocaleDateString() }}
              </button>
            </div>
          </template>
        </v-date-picker>

        <vue-tags-input placeholder="add tags..." :tags="state.tags" @tags-changed="(newTags) => (state.tags = newTags)" />
      </div>

      <div class="pt-2">
        <button class="app-btn-primary" @click="submit()">Add</button>
        <button class="app-btn-secondary" @click="discardForm()">Discard</button>
      </div>
    </div>
  </div>
</template>
