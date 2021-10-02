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
          class="app-chip-s1 mt-1 hidden sm:inline-block"
          >{{ tag }}</span
        >
      </div>
      <span :id="'popper-button' + index" class="w-4 h-4">
        <DotsHorizontalIcon
          title="open action menu"
          class="w-4 h-4 cursor-pointer hidden action-menu"
          @click="openPopperMenu('popperMenu' + index)"
        />
      </span>
      <Popper
        :id="'popper-menu' + index"
        :ref="'popperMenu' + index"
        :trigger-element-selector="'#popper-button' + index"
        :popper-element-selector="'#popper-menu' + index"
        placement="left"
      >
        <template #body>
          <div
            class="
              bg-white
              border
              mr-3
              block
              z-50
              font-normal
              leading-normal
              text-sm
              max-w-xs
              text-left
              no-underline
              break-words
              rounded-lg
            "
          >
            <div>
              <div class="text-gray-700 p-2">
                <p
                  class="
                    text-sm
                    p-2
                    font-normal
                    block
                    w-full
                    whitespace-nowrap
                    bg-transparent
                    text-gray-700
                    hover:bg-gray-100
                    rounded
                    cursor-pointer
                  "
                  @click="gotoDetails(event)"
                >
                  <ArrowRightIcon class="w-4 h-4 inline-block" /> Go to details
                </p>
                <p
                  class="
                    text-sm
                    p-2
                    font-normal
                    block
                    w-full
                    whitespace-nowrap
                    bg-transparent
                    text-red-500
                    hover:bg-gray-100
                    rounded
                    cursor-pointer
                  "
                  @click="onDeleteAction(event)"
                >
                  <TrashIcon class="w-4 h-4 inline-block" /> Delete event
                </p>
              </div>
            </div>
          </div>
        </template>
      </Popper>
    </div>

    <Modal ref="deleteModal" title="Confirm deletion">
      <template #body>Are you sure you want to delete this event? </template>
      <template #footer>
        <div class="mx-4 mb-4 flex flex-row-reverse">
          <button class="app-btn-secondary" @click="cancelDelete()">
            Cancel
          </button>
          <button class="app-btn-danger" @click="deleteEvent()">Delete</button>
        </div>
      </template>
    </Modal>
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
  import eventStoreService from './store/eventStoreService'
  import RefreshIcon from '@/assets/refresh-icon.svg?component'
  import PlusIcon from '@/assets/plus-icon.svg?component'
  import DotsHorizontalIcon from '@/assets/dots-horizontal-icon.svg?component'
  import Popper from '@/components/Popper.vue'
  import TrashIcon from '@/assets/trash-icon.svg?component'
  import ArrowRightIcon from '@/assets/arrow-right-icon.svg?component'
  import Modal from '@/components/Modal.vue'

  export default defineComponent({
    components: {
      EventQuickAddForm,
      DotsHorizontalIcon,
      RefreshIcon,
      PlusIcon,
      Popper,
      TrashIcon,
      ArrowRightIcon,
      Modal,
    },
    props: {},
    data() {
      return {
        tobeDeletedEventId: 0,
      }
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
      deleteModal() {
        return this.$refs.deleteModal as any
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
        var response = await EventApiService.add(event, true)

        if (response) {
          event.id = (response.data as EventModel).id
        }

        var updatedEvents = [...this.events]
        updatedEvents.unshift(event)

        eventStoreService.updateEventList(updatedEvents)
      },
      async removeEvent(event: EventModel) {
        appStoreService.toggleLoading(true)

        var response = await EventApiService.delete(event.id, true)

        appStoreService.toggleLoading(false)

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

        var response = await EventApiService.query(queryModel, true)

        appStoreService.toggleLoading(false)

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
      openPopperMenu(refName) {
        var menu = this.$refs[refName] as any
        menu.togglePopper(true)
      },
      closePopperMenu(refName) {
        var menu = this.$refs[refName] as any
        menu.togglePopper(false)
      },
      onDeleteAction(event) {
        this.tobeDeletedEventId = event.id
        this.deleteModal.toggleModal(true)
      },
      cancelDelete() {
        this.tobeDeletedEventId = 0
        this.deleteModal.toggleModal(false)
      },
      async deleteEvent() {
        this.deleteModal.toggleModal(false)
        var response = await EventApiService.delete(
          this.tobeDeletedEventId,
          true
        )

        if (response) {
          var updatedEvents = [...eventStoreService.state.events]
          updatedEvents = updatedEvents.filter(
            (r) => r.id != this.tobeDeletedEventId
          )

          eventStoreService.updateEventList(updatedEvents)
        }

        // Reset tobe deleted Id
        this.tobeDeletedEventId = 0
      },
    },
  })
</script>

<style scoped lang="postcss">
  .event-item-row:hover .action-menu {
    display: inline-block;
  }
</style>
