<template>
  <EventQuickAddForm
    ref="addTodoForm"
    @on-new-event-added="addNewEvent($event)"
  />

  <!-- Action bar -->
  <div v-if="!isQuickAddFormOpen" class="flex">
    <span class="app-action-link" @click="openForm()">
      <PlusIcon class="inline-block h-4 w-4" />
      <span>Add new event</span>
    </span>
    <span class="flex-grow"></span>
    <span
      class="hover:cursor-pointer hover:text-green-700 text-green-500 mb-4"
      @click="fetchEvents()"
    >
      <RefreshIcon class="h-4 w-4 inline-block" />
      Refresh
    </span>
  </div>

  <div
    v-for="(event, index) in events"
    :key="index"
    class="
      event-item-row
      border-b border-gray-400
      px-4
      py-2
      mb-2
      border-opacity-25
    "
  >
    <div class="pb-2">
      <span
        class="cursor-pointer hover:text-green-700"
        @click="gotoDetails(event)"
        >{{ event.title }}</span
      >
    </div>

    <div class="flex justify-between">
      <span class="text-xs self-end">{{
        $filters.formatDate(event.eventDate)
      }}</span>

      <div>
        <span
          v-for="(tag, tagIndex) in event.tags"
          :key="tagIndex"
          class="app-chip-s1 inline-block mt-1"
          >{{ tag }}</span
        >
      </div>
      <span class="w-4 h-4">
        <TrashIcon
          title="Remove event"
          class="w-4 h-4 cursor-pointer hidden trash-icon"
          @click="removeEvent(event)"
        />
      </span>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import dayjs from 'dayjs'
  import EventApiService from './api-services/EventApiService'
  import EventQueryModel from './api-services/models/EventQueryModel'
  import appStoreService from '@/store/application/applicationStoreService'
  import EventModel from './api-services/models/EventModel'
  import EventQuickAddForm from './EventQuickAddForm.vue'
  import TrashIcon from '@/assets/trash-icon.svg?component'
  import eventStoreService from './store/eventStoreService'
  import RefreshIcon from '@/assets/refresh-icon.svg?component'
  import PlusIcon from '@/assets/plus-icon.svg?component'

  export default defineComponent({
    components: {
      EventQuickAddForm,
      TrashIcon,
      RefreshIcon,
      PlusIcon,
    },
    props: {},
    data() {
      return {}
    },
    computed: {
      events(): Array<EventModel> {
        return eventStoreService.state.events as Array<EventModel>
      },
      isQuickAddFormOpen() {
        if (this.$refs) {
          var form = this.$refs.addTodoForm as any
          return form?.isFormOpen
        }
        return false
      },
    },
    async created() {
      // first time, fetch the list
      if (!this.events || this.events.length == 0) {
        await this.fetchEvents()
      }

      // If events data already loaded and the events list has been outdated for 5 mins --> fetch the list again
      if (eventStoreService.state.eventsUpdatedTime) {
        var MILISECONDS_IN_MINUTE = 1000 * 60
        var now = dayjs()
        var eventsUpdatedTime = dayjs(eventStoreService.state.eventsUpdatedTime)
        const diffMinutes = now.diff(eventsUpdatedTime) / MILISECONDS_IN_MINUTE

        if (diffMinutes > 5) {
          await this.fetchEvents()
        }
      }
    },
    methods: {
      async addNewEvent(event: EventModel) {
        appStoreService.toggleLoading(true)

        var response = await EventApiService.add(event).finally(() => {
          appStoreService.toggleLoading(false)
          return null
        })

        if (response) {
          event.id = (response.data as EventModel).id
        }

        var updatedEvents = [...this.events]
        updatedEvents.unshift(event)

        eventStoreService.updateEventList(updatedEvents)
      },
      async removeEvent(event: EventModel) {
        appStoreService.toggleLoading(true)

        var response = await EventApiService.delete(event.id).finally(() => {
          appStoreService.toggleLoading(false)
          return null
        })

        if (response) {
          var updatedEvents = [...this.events].filter((r) => r.id != event.id)
          eventStoreService.updateEventList(updatedEvents)
        }
      },
      async fetchEvents() {
        var queryModel = new EventQueryModel()
        queryModel.limit = 100
        queryModel.offset = 0

        appStoreService.toggleLoading(true)

        var response = await EventApiService.query(queryModel).finally(() => {
          appStoreService.toggleLoading(false)
          return null
        })

        if (response) {
          var events = response.data as Array<EventModel>
          eventStoreService.updateEventList(events)
        }
      },
      gotoDetails(event: EventModel) {
        this.$router.push({
          name: 'event-details',
          params: { eventId: event.id },
        })
      },
      openForm() {
        var form = this.$refs.addTodoForm as any
        form.openForm()
      },
    },
  })
</script>

<style scoped lang="postcss">
  .event-item-row:hover .trash-icon {
    display: inline-block;
  }
</style>
