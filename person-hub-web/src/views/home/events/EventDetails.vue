<template>
  <div class="flex">
    <div class="app-action-link" @click="goBack()"><ArrowLeftIcon class="h-4 w-4 inline-block" /> back</div>
    <span class="flex-grow"></span>

    <button class="app-btn-primary" @click="save()">Save</button>
    <button class="app-btn-secondary" @click="cancel()">Cancel</button>
  </div>

  <div v-if="!event.id">Loading...</div>

  <div v-if="event.id" class="p-2">
    <div class="pb-2 flex flex-row w-full">
      <input v-model="event.title" type="text" placeholder="Title" class="app-input w-full text-xl" />
    </div>

    <div class="pb-2 flex flex-row w-full">
      <textarea v-model="event.description" rows="5" type="text" placeholder="Description" class="app-input w-full no-border-bottom h-auto" />
    </div>

    <div class="pb-2 flex flex-row w-full">
      <v-date-picker v-model="event.eventDate">
        <template #default="{ togglePopover }">
          <div class="flex flex-wrap">
            <button class="app-btn-datepicker" @click.stop="dateSelected($event, togglePopover)">
              {{ event.eventDate.toLocaleDateString() }}
            </button>
          </div>
        </template>
      </v-date-picker>

      <vue-tags-input placeholder="add tags..." :tags="tags" @tags-changed="(newTags) => (tags = newTags)" />
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
<script lang="ts">
  import { defineComponent } from 'vue'
  import EventModel from './api-services/models/EventModel'
  import VueTagsInput from '@sipec/vue3-tags-input'
  import EventApiService from './api-services/EventApiService'
  import eventStoreService from './store/eventStoreService'
  import ArrowLeftIcon from '@/assets/arrow-left-icon.svg?component'
  import Modal from '@/components/Modal.vue'

  export default defineComponent({
    components: {
      VueTagsInput,
      ArrowLeftIcon,
      Modal,
    },
    props: {
      eventId: {
        type: Number,
        default: 0,
      },
    },
    data() {
      return {
        event: new EventModel(),
        tag: '',
        tags: [],
      }
    },
    computed: {
      deleteModal() {
        return this.$refs.deleteModal as any
      },
    },
    async created() {
      var response = await EventApiService.get(this.eventId, false)

      if (response) {
        this.event = response.data as EventModel

        this.event.eventDate = new Date(this.event.eventDate)

        this.tags = this.event.tags.map((tag) => {
          return {
            text: tag,
          }
        })
      }
    },
    methods: {
      async save() {
        this.event.tags = this.tags.map((r) => r.text)

        var response = await EventApiService.update(this.eventId, this.event, true)

        // Update the event in the store
        if (response) {
          var updatedEvents = [...eventStoreService.state.events]
          updatedEvents[updatedEvents.findIndex((r) => r.id == this.event.id)] = { ...this.event }

          eventStoreService.updateEventList(updatedEvents)
        }
      },
      cancel() {
        this.goBack()
      },
      goBack() {
        this.$router.push({
          name: 'events-view',
        })
      },
      dateSelected(e, toogleFunc) {
        toogleFunc({ ref: e.target })
      },
      onDeleteAction() {
        this.deleteModal.toggleModal(true)
      },
      async deleteEvent() {
        this.deleteModal.toggleModal(false)
        var response = await EventApiService.delete(this.eventId, true)

        if (response) {
          var updatedEvents = [...eventStoreService.state.events]
          updatedEvents = updatedEvents.filter((r) => r.id != this.eventId)

          eventStoreService.updateEventList(updatedEvents)
          this.goBack()
        }
      },
    },
  })
</script>

<style scoped lang="postcss">
  .no-border-bottom {
    @apply border-b-0 !important;
  }
</style>
