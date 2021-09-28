<template>
  <div v-if="!event.id">Loading...</div>
  <div v-if="event.id" class="p-2">
    <div class="pb-2 flex flex-row w-full">
      <input
        v-model="event.title"
        type="text"
        placeholder="Title"
        class="app-input w-full"
      />
    </div>

    <div class="pb-2 flex flex-row w-full">
      <textarea
        v-model="event.description"
        type="text"
        placeholder="Description"
        class="app-input w-full"
      />
    </div>

    <div class="pb-2 flex flex-row w-full">
      <v-date-picker v-model="event.eventDate">
        <template #default="{ togglePopover }">
          <div class="flex flex-wrap">
            <button
              class="app-btn-datepicker"
              @click.stop="dateSelected($event, togglePopover)"
            >
              {{ event.eventDate.toLocaleDateString() }}
            </button>
          </div>
        </template>
      </v-date-picker>

      <vue-tags-input
        placeholder="add tags..."
        :tags="tags"
        @tags-changed="(newTags) => (tags = newTags)"
      />
    </div>

    <div class="pt-2">
      <button class="app-btn-primary" @click="save()">Save</button>
      <button class="app-btn-secondary" @click="cancel()">Cancel</button>
    </div>
  </div>
</template>
<script lang="ts">
  import { defineComponent } from 'vue'
  import EventModel from './api-services/models/EventModel'
  import VueTagsInput from '@sipec/vue3-tags-input'
  import EventApiService from './api-services/EventApiService'

  export default defineComponent({
    components: {
      VueTagsInput,
    },
    props: {
      eventId: {
        type: Number,
        default: 0,
      },
    },
    emits: ['onAddNewEvent'],
    data() {
      return {
        event: new EventModel(),
        tag: '',
        tags: [],
      }
    },
    async created() {
      var response = await EventApiService.get(this.eventId).catch(() => {
        return null
      })

      if (response) {
        this.event = response.data as EventModel

        this.event.eventDate = new Date(this.event.eventDate)

        this.tags = this.event.tags
      }
    },
    methods: {
      async save() {
        this.event.tags = this.tags.map((r) => r.text)

        await EventApiService.update(this.eventId, this.event).catch(() => {
          //TODO: handle loading here
        })
      },
      cancel() {
        //TODO: navigate back
      },
      dateSelected(e, toogleFunc) {
        toogleFunc({ ref: e.target })
      },
    },
  })
</script>
