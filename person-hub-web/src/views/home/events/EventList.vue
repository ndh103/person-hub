<template>
  <AddEventForm @on-add-new-event="addNewEvent($event)" />

  <div
    v-for="(event, index) in events"
    :key="index"
    class="border-b border-gray-400 px-4 py-2 mb-2"
  >
    {{ event.title }}
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import EventApiService from './api-services/EventApiService'
  import EventQueryModel from './api-services/models/EventQueryModel'
  import AppStoreService from '@/store/application/applicationStoreService'
  import EventModel from './api-services/models/EventModel'
  import AddEventForm from './AddEventForm.vue'

  export default defineComponent({
    components: {
      AddEventForm,
    },
    props: {},
    data() {
      return {
        events: new Array<EventModel>(),
      }
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
    },
  })
</script>
