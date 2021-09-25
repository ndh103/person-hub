<template>
  <div
    v-if="!isFormOpen"
    class="hover:cursor-pointer hover:text-red-400"
    @click="openForm()"
  >
    <PlusIcon class="inline-block" /> Add new event
  </div>

  <div v-if="isFormOpen">
    <div class="p-2 m-2 flex flex-row w-full">
      <input
        v-model="event.title"
        type="text"
        placeholder="Title"
        class="app-input"
      />
    </div>

    <div class="p-2 m-2 flex flex-row w-full">
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
    </div>

    <div class="p-2 m-2 flex flex-row w-full">
      <input
        v-model="event.tags"
        type="text"
        placeholder="Tags"
        class="app-input"
      />
    </div>

    <div>
      <button class="app-btn-primary" @click="submit()">Add</button>
      <button class="app-btn-secondary" @click="discardForm()">Discard</button>
    </div>
  </div>
</template>
<script lang="ts">
  import { defineComponent } from 'vue'
  import PlusIcon from '@/assets/plus-icon.svg?component'
  import EventModel from './api-services/models/EventModel'

  export default defineComponent({
    components: {
      PlusIcon,
    },
    emits: ['onAddNewEvent'],

    data() {
      return {
        event: new EventModel(),
        isFormOpen: false,
      }
    },
    created() {
      this.event.eventDate = new Date()
    },
    methods: {
      submit() {
        //TODO: validate the event here
        this.$emit('onAddNewEvent', { ...this.event })

        this.isFormOpen = false
      },
      openForm() {
        this.isFormOpen = true
      },
      discardForm() {
        this.isFormOpen = false
      },
      dateSelected(e, toogleFunc) {
        toogleFunc({ ref: e.target })
      },
    },
  })
</script>
