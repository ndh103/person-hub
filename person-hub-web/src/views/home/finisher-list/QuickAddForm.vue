<template>
  <div class="px-2 pb-6">
    <div v-if="isFormOpen" class="p-2 border border-gray-400 px-4 rounded border-opacity-50">
      <div class="pb-2 flex flex-row w-full">
        <input v-model="item.title" type="text" placeholder="Title" class="app-input w-full" />
      </div>

      <div class="pb-2 flex flex-row w-full">
        <textarea v-model="item.description" type="text" placeholder="Description" class="app-input w-full" />
      </div>

      <div class="pb-2 flex flex-row w-full">
        <Switch v-model="isStarted" on-title="Started" off-title="Planning" class="pt-2 pr-2"></Switch>
        <v-date-picker v-if="isStarted" v-model="item.startDate">
          <template #default="{ togglePopover }">
            <div class="flex flex-wrap">
              <button class="app-btn-datepicker" @click.stop="dateSelected($event, togglePopover)">
                {{ item.startDate.toLocaleDateString() }}
              </button>
            </div>
          </template>
        </v-date-picker>

        <vue-tags-input class="flex-grow" placeholder="add tags..." :tags="tags" @tags-changed="(newTags) => (tags = newTags)" />
      </div>

      <div class="pb-2 flex flex-row w-full"></div>

      <div class="pt-2">
        <button class="app-btn-primary" @click="submit()">Add</button>
        <button class="app-btn-secondary" @click="discardForm()">Discard</button>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
  import { defineComponent } from 'vue'
  import FinisherItem from './api-services/models/FinisherItem'
  import VueTagsInput from '@sipec/vue3-tags-input'
  import Switch from '@/components/Switch.vue'

  export default defineComponent({
    components: {
      VueTagsInput,
      Switch,
    },
    emits: ['onNewItemAdded'],

    data() {
      return {
        item: new FinisherItem(),
        isFormOpen: false,
        tag: '',
        tags: [],
        isStarted: false,
      }
    },
    created() {
      this.item.startDate = new Date()
    },
    methods: {
      submit() {
        this.item.tags = this.tags.map((r) => r.text)

        //TODO: validate the event here
        this.$emit('onNewItemAdded', { ...this.item })

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
        this.item = new FinisherItem()
        this.item.startDate = new Date()
        this.tag = ''
        this.tags = []
      },
      dateSelected(e, toogleFunc) {
        toogleFunc({ ref: e.target })
      },
    },
  })
</script>
