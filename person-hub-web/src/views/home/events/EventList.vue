<template>
  <EventQuickAddForm @on-add-new-event="addNewEvent($event)" />

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
    <div>
      <span>{{ event.title }}</span>
    </div>

    <div class="flex justify-between">
      <span class="text-xs self-end">{{
        $filters.formatDate(event.eventDate)
      }}</span>

      <div>
        <span
          v-for="(tag, tagIndex) in event.tags"
          :key="tagIndex"
          class="app-chip-s1"
          >{{ tag }}</span
        >
      </div>
      <span class="w-4 h-4">
        <ArrowRightIcon
          title="Go to event details"
          class="w-4 h-4 cursor-pointer hidden trash-icon"
          @click="gotoEventDetails(event)"
        />
      </span>
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
  import EventApiService from './api-services/EventApiService'
  import EventQueryModel from './api-services/models/EventQueryModel'
  import AppStoreService from '@/store/application/applicationStoreService'
  import EventModel from './api-services/models/EventModel'
  import EventQuickAddForm from './EventQuickAddForm.vue'
  import TrashIcon from '@/assets/trash-icon.svg?component'
  import ArrowRightIcon from '@/assets/arrow-right-icon.svg?component'
  import dayjs from 'dayjs'

  export default defineComponent({
    components: {
      EventQuickAddForm,
      TrashIcon,
      ArrowRightIcon,
    },
    props: {},
    data() {
      return {
        events: new Array<EventModel>(),
      }
    },
    computed: {
      eventDateDisplay(eventDate) {
        return dayjs(eventDate).format('dd mm yyyy')
      },
    },
    async created() {
      var queryModel = new EventQueryModel()
      queryModel.limit = 100
      queryModel.offset = 0

      AppStoreService.toggleLoading(true)

      var response = await EventApiService.query(queryModel).catch(() => {
        AppStoreService.toggleLoading(false)
        return null
      })

      AppStoreService.toggleLoading(false)

      if (response) {
        this.events = response.data as Array<EventModel>
      }
    },
    methods: {
      async addNewEvent(event: EventModel) {
        var response = await EventApiService.add(event).catch(() => {
          return null
        })

        if (response) {
          event.id = response.data.id
        }

        this.events.unshift(event)
      },
      async removeEvent(event: EventModel) {
        var response = await EventApiService.delete(event.id).catch(() => {
          return null
        })

        if (response) {
          this.events = this.events.filter((r) => r.id != event.id)
        }
      },
      gotoEventDetails(event: EventModel) {
        this.$router.push({
          name: 'event-details',
          params: { eventId: event.id },
        })
      },
    },
  })
</script>

<style scoped lang="postcss">
  .event-item-row:hover .trash-icon {
    display: inline-block;
  }
</style>
