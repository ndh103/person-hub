<script setup lang="ts">
  import { onMounted, ref } from 'vue'
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
  import YearEventViewModel from './view-models/YearEventViewModel'
  import MonthEventViewModel from './view-models/MonthEventViewModel'
  import TopTags from './TopTags.vue'
  import { computed } from '@vue/reactivity'
  import { useRouter } from 'vue-router'

  const router = useRouter()

  const state = ref({
    tobeDeletedEventId: 0,
    currentPopperMenuEventId: 0,
  })

  const quickAddFormRef = ref(null)
  const deleteModalRef = ref(null)
  const popperMenuRef = ref(null)
  const topTagsRef = ref(null)

  const events = computed(() => {
    return eventStoreService.state.events as Array<EventModel>
  })

  const yearEvents = computed(() => {
    var events = eventStoreService.state.events as Array<EventModel>

    var allYears = events.map((e: EventModel) => {
      var eventDate = new Date(e.eventDate)
      var year = eventDate.getFullYear()
      return year
    })

    var distinctYearSet = new Set(allYears)
    // Get the distinct year list
    var years = [...distinctYearSet]

    var yearEvents = new Array<YearEventViewModel>()

    years.forEach((year: number) => {
      var yearEvent = new YearEventViewModel()
      yearEvent.year = year

      var filterByYearEvents = events.filter((e: EventModel) => {
        var eventDate = new Date(e.eventDate)
        return eventDate.getFullYear() == year
      })

      var duplicatedMonths = filterByYearEvents.map((e: EventModel) => {
        var eventDate = new Date(e.eventDate)
        return eventDate.getMonth()
      })

      var distinctMonthSet = new Set(duplicatedMonths)
      var months = [...distinctMonthSet]
      var monthEvents = new Array<MonthEventViewModel>()

      months.forEach((month: number) => {
        var filterByYearAndMonthEvents = filterByYearEvents.filter((e: EventModel) => {
          var eventDate = new Date(e.eventDate)
          return eventDate.getMonth() == month
        })

        var monthEvent = new MonthEventViewModel()
        monthEvent.month = month
        monthEvent.events = [...filterByYearAndMonthEvents]

        monthEvents.push(monthEvent)
      })

      yearEvent.monthEvents = [...monthEvents]
      yearEvents.push(yearEvent)
    })

    return yearEvents
  })

  const isQuickAddFormOpen = computed(() => {
    return quickAddFormRef.value && quickAddFormRef.value.isFormOpen
  })

  onMounted(async () => {
    // first time, fetch the list
    if (!events.value || events.value.length == 0) {
      await fetchEvents()
    }

    // If events data already loaded and the events list has been outdated for 5 mins --> fetch the list again
    if (eventStoreService.state.eventsUpdatedTime) {
      var MILISECONDS_IN_MINUTE = 1000 * 60
      var now = dayjs()
      var eventsUpdatedTime = dayjs(eventStoreService.state.eventsUpdatedTime)
      const diffMinutes = now.diff(eventsUpdatedTime) / MILISECONDS_IN_MINUTE

      if (diffMinutes > 5) {
        await fetchEvents()
      }
    }
  })

  async function addNewEvent(event: EventModel) {
    var response = await EventApiService.add(event, true)

    if (response) {
      event.id = (response.data as EventModel).id
    }

    var updatedEvents = [...events.value]
    updatedEvents.unshift(event)

    eventStoreService.updateEventList(updatedEvents)
  }

  async function removeEvent(event: EventModel) {
    appStoreService.toggleLoading(true)

    var response = await EventApiService.delete(event.id, true)

    appStoreService.toggleLoading(false)

    if (response) {
      var updatedEvents = [...events.value].filter((r) => r.id != event.id)
      eventStoreService.updateEventList(updatedEvents)
    }
  }

  async function fetchEvents(tag = '') {
    var queryModel = new EventQueryModel()
    queryModel.limit = 100
    queryModel.offset = 0

    if (tag) {
      queryModel.tags = [tag]
    }

    appStoreService.toggleLoading(true)

    var response = await EventApiService.query(queryModel, true)

    appStoreService.toggleLoading(false)

    if (response) {
      var events = response.data as Array<EventModel>
      eventStoreService.updateEventList(events)
    }
  }

  function gotoDetails(eventId: number) {
    router.push({
      name: 'event-details',
      params: { eventId: eventId },
    })
  }

  function openForm() {
    quickAddFormRef.value.openForm()
  }

  function openPopperMenu(eventId) {
    state.value.currentPopperMenuEventId = eventId
    popperMenuRef.value.togglePopper(true)
  }

  function closePopperMenu(refName) {
    popperMenuRef.value.togglePopper(false)
  }

  function onDeleteAction(eventId: number) {
    state.value.tobeDeletedEventId = eventId
    deleteModalRef.value.toggleModal(true)
  }

  function cancelDelete() {
    state.value.tobeDeletedEventId = 0
    deleteModalRef.value.toggleModal(false)
  }

  async function deleteEvent() {
    deleteModalRef.value.toggleModal(false)
    var response = await EventApiService.delete(state.value.tobeDeletedEventId, true)

    if (response) {
      var updatedEvents = [...eventStoreService.state.events]
      updatedEvents = updatedEvents.filter((r) => r.id != state.value.tobeDeletedEventId)

      eventStoreService.updateEventList(updatedEvents)
    }

    // Reset tobe deleted Id
    state.value.tobeDeletedEventId = 0
  }

  async function refresh() {
    await fetchEvents()
    await topTagsRef.value.refresh()
  }
</script>

<template>
  <!-- Action bar -->
  <div v-if="!isQuickAddFormOpen" class="flex">
    <span class="app-action-link" @click="openForm()">
      <PlusIcon class="inline-block h-4 w-4" />
      <span>Add new</span>
    </span>
    <span class="flex-grow"></span>
    <span class="hover:cursor-pointer hover:text-emerald-700 text-emerald-500 mb-4" @click="refresh()">
      <RefreshIcon class="h-4 w-4 inline-block" />
      Refresh
    </span>
  </div>

  <EventQuickAddForm ref="quickAddFormRef" @on-new-event-added="addNewEvent($event)" />

  <TopTags ref="topTagsRef" @on-filter-by-tag="fetchEvents($event)"></TopTags>

  <div v-for="(yearEvent, yearEventIndex) in yearEvents" :key="yearEventIndex">
    <div>
      <span class="font-bold"> {{ yearEvent.year }}</span>
    </div>
    <div v-for="(monthEvent, monthEventIndex) in yearEvent.monthEvents" :key="monthEventIndex">
      <div class="py-4">
        <span class="app-chip-simple mt-1 hidden sm:inline-block">{{ $filters.toMonthName(monthEvent.month) }}</span>
      </div>

      <div v-for="(event, index) in monthEvent.events" :key="index" class="event-item-row border-b border-gray-400 ml-6 mr-2 py-2 mb-2 border-opacity-25">
        <div class="pb-2">
          <span class="cursor-pointer hover:text-emerald-700" @click="gotoDetails(event.id)">{{ event.title }}</span>
        </div>

        <div class="flex justify-between">
          <span class="text-xs self-end">{{ $filters.formatDate(event.eventDate) }}</span>

          <div>
            <span v-for="(tag, tagIndex) in event.tags" :key="tagIndex" class="app-chip-simple mt-1 hidden sm:inline-block">{{ tag }}</span>
          </div>
          <span id="popperMenuButton" class="w-4 h-4">
            <DotsHorizontalIcon title="open action menu" class="w-4 h-4 cursor-pointer hidden action-menu" @click="openPopperMenu(event.id)" />
          </span>
        </div>
      </div>
    </div>
  </div>

  <Popper id="popperMenu" ref="popperMenuRef" trigger-element-selector="#popperMenuButton" popper-element-selector="#popperMenu" placement="left">
    <template #body>
      <div class="bg-white border mr-3 block z-50 font-normal leading-normal text-sm max-w-xs text-left no-underline break-words rounded-lg">
        <div>
          <div class="text-gray-700 p-2">
            <p
              class="text-sm p-2 font-normal block w-full whitespace-nowrap bg-transparent text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              @click="gotoDetails(state.currentPopperMenuEventId)"
            >
              <ArrowRightIcon class="w-4 h-4 inline-block" /> Go to details
            </p>
            <p
              class="text-sm p-2 font-normal block w-full whitespace-nowrap bg-transparent text-red-500 hover:bg-gray-100 rounded cursor-pointer"
              @click="onDeleteAction(state.currentPopperMenuEventId)"
            >
              <TrashIcon class="w-4 h-4 inline-block" /> Delete event
            </p>
          </div>
        </div>
      </div>
    </template>
  </Popper>

  <Modal ref="deleteModalRef" title="Confirm deletion">
    <template #body>Are you sure you want to delete this event? </template>
    <template #footer>
      <div class="mx-4 mb-4 flex flex-row-reverse">
        <button class="app-btn-secondary" @click="cancelDelete()">Cancel</button>
        <button class="app-btn-danger" @click="deleteEvent()">Delete</button>
      </div>
    </template>
  </Modal>
</template>

<style scoped lang="postcss">
  .event-item-row:hover .action-menu {
    display: inline-block;
  }
</style>
