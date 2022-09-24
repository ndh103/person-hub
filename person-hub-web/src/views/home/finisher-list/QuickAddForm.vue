<script setup lang="ts">
  import { onMounted, ref, defineExpose } from 'vue'
  import FinisherItem from './api-services/models/FinisherItem'
  import VueTagsInput from '@sipec/vue3-tags-input'
  import Switch from '@/components/Switch.vue'
  import FinisherItemStatus from './api-services/models/FinisherItemStatus'

  const emit = defineEmits<{
    (event: 'onNewItemAdded', data: FinisherItem)
  }>()

  const state = ref({
    item: new FinisherItem(),
    isFormOpen: false,
    tag: '',
    tags: [],
    isStarted: false,
  })

  onMounted(() => {
    state.value.item.startDate = new Date()
  })

  function submit() {
    state.value.item.tags = state.value.tags.map((r) => r.text)

    state.value.item.status = state.value.isStarted ? FinisherItemStatus.Started : FinisherItemStatus.Planning

    //TODO: validate the event here
    emit('onNewItemAdded', { ...state.value.item })

    state.value.isFormOpen = false
  }

  function openForm() {
    state.value.isFormOpen = true
    resetForm()
  }

  function discardForm() {
    state.value.isFormOpen = false
    resetForm()
  }
  function resetForm() {
    state.value.item = new FinisherItem()
    state.value.item.startDate = new Date()
    state.value.tag = ''
    state.value.tags = []
  }
  function dateSelected(e, toogleFunc) {
    toogleFunc({ ref: e.target })
  }

  defineExpose({
    openForm,
  })
</script>

<template>
  <div class="px-2 pb-6">
    <div v-if="state.isFormOpen" class="p-2 border border-gray-400 px-4 rounded border-opacity-50">
      <div class="pb-2 flex flex-row w-full">
        <input v-model="state.item.title" type="text" placeholder="Title" class="app-input w-full" />
      </div>

      <div class="pb-2 flex flex-row w-full">
        <textarea v-model="state.item.description" type="text" placeholder="Description" class="app-input w-full" />
      </div>

      <div class="pb-2 flex flex-row w-full">
        <Switch v-model="state.isStarted" on-title="Started" off-title="Planning" class="pt-2 pr-2"></Switch>
        <v-date-picker v-if="state.isStarted" v-model="state.item.startDate">
          <template #default="{ togglePopover }">
            <div class="flex flex-wrap">
              <button class="app-btn-datepicker" @click.stop="dateSelected($event, togglePopover)">
                {{ state.item.startDate.toLocaleDateString() }}
              </button>
            </div>
          </template>
        </v-date-picker>

        <vue-tags-input class="flex-grow" placeholder="add tags..." :tags="state.tags" @tags-changed="(newTags) => (state.tags = newTags)" />
      </div>

      <div class="pb-2 flex flex-row w-full"></div>

      <div class="pt-2">
        <button class="app-btn-primary" @click="submit()">Add</button>
        <button class="app-btn-secondary" @click="discardForm()">Discard</button>
      </div>
    </div>
  </div>
</template>
