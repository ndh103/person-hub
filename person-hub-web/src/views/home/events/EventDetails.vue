<script setup lang="ts">
  import { onMounted } from 'vue'
  import EventModel from './api-services/models/EventModel'
  import VueTagsInput from '@sipec/vue3-tags-input'
  import EventApiService from './api-services/EventApiService'
  import eventStoreService from './store/eventStoreService'
  import ArrowLeftIcon from '@/assets/arrow-left-icon.svg?component'
  import Modal from '@/components/Modal.vue'
  import { ref } from '@vue/reactivity'
  import { useRouter } from 'vue-router'

  const props = defineProps({
    eventId: {
      type: Number,
      default: 0,
    },
  })

  const state = ref({
    event: new EventModel(),
    tag: '',
    tags: [],
  })

  const router = useRouter()

  const deleteModal = ref(null)

  onMounted(async () => {
    var response = await EventApiService.get(props.eventId, false)

    if (response) {
      state.value.event = response.data as EventModel

      state.value.event.eventDate = new Date(state.value.event.eventDate)

      state.value.tags = state.value.event.tags.map((tag) => {
        return {
          text: tag,
        }
      })
    }
  })

  async function save() {
    state.value.event.tags = state.value.tags.map((r) => r.text)

    var response = await EventApiService.update(props.eventId, state.value.event, true)

    // Update the event in the store
    if (response) {
      var updatedEvents = [...eventStoreService.state.events]
      updatedEvents[updatedEvents.findIndex((r) => r.id == state.value.event.id)] = { ...state.value.event }

      eventStoreService.updateEventList(updatedEvents)
    }
  }

  function cancel() {
    goBack()
  }
  function goBack() {
    router.push({
      name: 'events-view',
    })
  }

  function dateSelected(e, toogleFunc) {
    toogleFunc({ ref: e.target })
  }

  function onDeleteAction() {
    deleteModal.value.toggleModal(true)
  }

  async function deleteEvent() {
    deleteModal.value.toggleModal(false)
    var response = await EventApiService.delete(props.eventId, true)

    if (response) {
      var updatedEvents = [...eventStoreService.state.events]
      updatedEvents = updatedEvents.filter((r) => r.id != props.eventId)

      eventStoreService.updateEventList(updatedEvents)
      goBack()
    }
  }
</script>

<template>
  <div class="flex">
    <div class="app-action-link" @click="goBack()"><ArrowLeftIcon class="h-4 w-4 inline-block" /> back</div>
    <span class="flex-grow"></span>

    <button class="app-btn-primary" @click="save()">Save</button>
    <button class="app-btn-secondary" @click="cancel()">Cancel</button>
  </div>

  <div v-if="!state.event.id">Loading...</div>

  <div v-if="state.event.id" class="p-2">
    <div class="pb-2 flex flex-row w-full">
      <input v-model="state.event.title" type="text" placeholder="Title" class="app-input w-full text-xl" />
    </div>

    <div class="pb-2 flex flex-row w-full">
      <textarea v-model="state.event.description" rows="5" type="text" placeholder="Description" class="app-input w-full no-border-bottom h-auto" />
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

      <vue-tags-input v-model="state.tag" placeholder="add tags..." :tags="state.tags" @tags-changed="(newTags) => (state.tags = newTags)" />
    </div>

    <div class="flex flex-row-reverse">
      <button class="app-btn-danger" @click="onDeleteAction()">Remove event</button>
    </div>

    <div>
      <Modal ref="deleteModal" title="Confirm deletion">
        <template #body>Are you sure you want to delete this event? </template>
        <template #footer>
          <div class="mx-4 mb-4 flex flex-row-reverse">
            <button class="app-btn-secondary" @click="deleteModal.toggleModal(false)">Cancel</button>
            <button class="app-btn-danger" @click="deleteEvent()">Delete</button>
          </div>
        </template>
      </Modal>
    </div>
  </div>
</template>

<style scoped lang="postcss">
  .no-border-bottom {
    @apply border-b-0 !important;
  }
</style>
