<template>
  <div class="p-2">
    <div
      v-if="!isFormOpen"
      class="hover:cursor-pointer hover:text-green-700 text-green-500"
      @click="openForm()"
    >
      <PlusIcon class="inline-block h-4 w-4" />
      <span>Add new event</span>
    </div>

    <div
      v-if="isFormOpen"
      class="p-2 border border-gray-400 px-4 rounded border-opacity-50"
    >
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
          v-model="event.tags"
          placeholder="add tags..."
          :tags="tags"
          @tags-changed="(newTags) => (tags = newTags)"
        />
      </div>

      <div class="pt-2">
        <button class="app-btn-primary" @click="submit()">Add</button>
        <button class="app-btn-secondary" @click="discardForm()">
          Discard
        </button>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
  import { defineComponent } from 'vue'
  import PlusIcon from '@/assets/plus-icon.svg?component'
  import EventModel from './api-services/models/EventModel'
  import VueTagsInput from '@sipec/vue3-tags-input'

  export default defineComponent({
    components: {
      PlusIcon,
      VueTagsInput,
    },
    emits: ['onAddNewEvent'],

    data() {
      return {
        event: new EventModel(),
        isFormOpen: false,
        tag: '',
        tags: [],
      }
    },
    created() {
      this.event.eventDate = new Date()
    },
    methods: {
      submit() {
        this.event.tags = this.tags.map((r) => r.text)

        //TODO: validate the event here
        this.$emit('onAddNewEvent', { ...this.event })

        this.isFormOpen = false
      },
      openForm() {
        this.isFormOpen = true
        this.resetForm()
      },
      discardForm() {
        this.isFormOpen = false
        this.resetForm()
      },
      resetForm() {
        this.event = new EventModel()
        this.event.eventDate = new Date()
        this.tag = ''
        this.tags = []
      },
      dateSelected(e, toogleFunc) {
        toogleFunc({ ref: e.target })
      },
    },
  })
</script>
