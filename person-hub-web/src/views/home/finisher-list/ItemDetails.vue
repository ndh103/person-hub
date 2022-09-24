<script setup lang="ts">
  import { defineComponent, onMounted, ref } from 'vue'
  import VueTagsInput from '@sipec/vue3-tags-input'
  import ArrowLeftIcon from '@/assets/arrow-left-icon.svg?component'
  import PencilIcon from '@/assets/pencil-icon.svg?component'
  import DotsVerticalIcon from '@/assets/dots-vertical-icon.svg?component'
  import TrashIcon from '@/assets/trash-icon.svg?component'
  import RouteStartIcon from '@/assets/route-start-icon.svg?component'
  import GoalIcon from '@/assets/goal-icon.svg?component'
  import Modal from '@/components/Modal.vue'
  import FinisherItem from './api-services/models/FinisherItem'
  import finisherItemApiService from './api-services/finisherItemApiService'
  import finisherListStoreService from './store/finisherListStoreService'
  import FinisherItemStatus from './api-services/models/FinisherItemStatus'
  import FinisherItemLog from './api-services/models/FinisherItemLog'
  import Popper from '@/components/Popper.vue'
  import { computed } from '@vue/reactivity'
  import { useRouter } from 'vue-router'

  const router = useRouter()

  const { itemId } = defineProps({
    itemId: {
      type: Number,
      default: 0,
    },
  })

  const state = ref({
    item: new FinisherItem(),
    tag: '',
    tags: [],
    itemStatusDate: new Date(),
    newLog: '',
    isEditMode: false,
  })

  const modalDeleteRef = ref(null)
  const modalChangeStatusRef = ref(null)
  const popperMenuRef = ref(null)

  const itemStatus = computed(() => {
    return FinisherItemStatus[state.value.item.status]
  })

  const itemStatusClass = computed(() => {
    switch (state.value.item.status) {
      case FinisherItemStatus.Planning:
        return 'app-chip-simple'
      case FinisherItemStatus.Started:
        return 'app-chip-primary'
      case FinisherItemStatus.Finished:
        return 'app-chip-pink'
    }
    return ''
  })

  onMounted(async () => {
    var response = await finisherItemApiService.get(itemId, false)

    if (response) {
      state.value.item = response.data as FinisherItem
      if (state.value.item.startDate) {
        state.value.item.startDate = new Date(state.value.item.startDate)
      }

      if (state.value.item.finishDate) {
        state.value.item.finishDate = new Date(state.value.item.finishDate)
      }

      state.value.tags = state.value.item.tags.map((tag) => {
        return {
          text: tag,
        }
      })
    }
  })

  async function save() {
    state.value.item.tags = state.value.tags.map((r) => r.text)

    var response = await finisherItemApiService.update(itemId, state.value.item, true)

    // Update the event in the store
    if (response) {
      finisherListStoreService.updateFinisherItem(state.value.item)
    }

    state.value.isEditMode = false
  }

  function cancel() {
    state.value.isEditMode = false
  }

  function goBack() {
    router.push({
      name: 'finisher-list-view',
    })
  }

  function dateSelected(e, toogleFunc) {
    toogleFunc({ ref: e.target })
  }

  function onDeleteAction() {
    modalDeleteRef.value.toggleModal(true)
  }

  function toogleEditMode() {
    state.value.isEditMode = true
  }

  function onChangeStatusItem() {
    state.value.itemStatusDate = new Date()
    modalChangeStatusRef.value.toggleModal(true)
  }

  async function deleteItem() {
    modalDeleteRef.value.toggleModal(false)
    var response = await finisherItemApiService.delete(itemId, true)

    if (response) {
      finisherListStoreService.removeFinisherItem(itemId)
      goBack()
    }
  }

  async function changeItemStatus() {
    modalChangeStatusRef.value.toggleModal(false)

    var response

    if (state.value.item.status == FinisherItemStatus.Planning) {
      response = await finisherItemApiService.start(itemId, { startDate: state.value.itemStatusDate }, true)

      if (response) {
        state.value.item.status = FinisherItemStatus.Started
        state.value.item.startDate = state.value.itemStatusDate
      }
    } else if (state.value.item.status == FinisherItemStatus.Started) {
      response = await finisherItemApiService.finish(itemId, { finishDate: state.value.itemStatusDate }, true)

      if (response) {
        state.value.item.status = FinisherItemStatus.Finished
        state.value.item.finishDate = state.value.itemStatusDate
      }
    } else {
      throw 'Status is not suported'
    }

    if (response) {
      finisherListStoreService.updateFinisherItem(state.value.item)
    }
  }

  async function addLog() {
    var itemLog = new FinisherItemLog()
    itemLog.content = state.value.newLog
    itemLog.createdDate = new Date()

    var response = await finisherItemApiService.addLog(state.value.item.id, itemLog, true)

    if (response) {
      itemLog.id = (response.data as FinisherItemLog).id
      state.value.item.logs.unshift(itemLog)

      state.value.newLog = ''
    }
  }

  function openPopperMenu() {
    popperMenuRef.value.togglePopper(true)
  }
</script>

<template>
  <div class="flex items-center">
    <div class="app-action-link" @click="goBack()"><ArrowLeftIcon class="app-icon-standard" /> back</div>

    <div class="flex-grow flex justify-center items-center">
      <span :class="itemStatusClass" class="h-6">{{ itemStatus }}</span>
      <span v-if="state.item.status == FinisherItemStatus.Started" class="app-btn-datepicker">{{ $filters.formatDate(state.item.startDate) }}</span>
      <span v-if="state.item.status == FinisherItemStatus.Finished" class="app-btn-datepicker"
        >{{ $filters.formatDate(state.item.startDate) }} - {{ $filters.formatDate(state.item.finishDate) }}</span
      >
    </div>

    <div v-if="!state.isEditMode">
      <button v-if="state.item.status == FinisherItemStatus.Planning" class="app-btn-primary" @click="onChangeStatusItem()">
        <RouteStartIcon class="app-icon-standard fill-current"></RouteStartIcon> Start this item
      </button>
      <button v-if="state.item.status == FinisherItemStatus.Started" class="app-btn-primary" @click="onChangeStatusItem()">
        <GoalIcon class="app-icon-standard fill-current" />
        Mark as done
      </button>
    </div>

    <div v-if="state.isEditMode">
      <button class="app-btn-secondary" @click="cancel()">Cancel</button>
      <button class="app-btn-primary" @click="save()">Save</button>
    </div>

    <span v-if="!state.isEditMode && state.item.status != FinisherItemStatus.Finished" id="popperMenuButton" class="w-4 h-4">
      <DotsVerticalIcon title="open action menu" class="app-icon-standard cursor-pointer action-menu" @click="openPopperMenu()" />
    </span>

    <Popper
      v-if="state.item.status != FinisherItemStatus.Finished"
      id="popperMenu"
      ref="popperMenuRef"
      trigger-element-selector="#popperMenuButton"
      popper-element-selector="#popperMenu"
      placement="bottom"
    >
      <template #body>
        <div class="bg-white border mr-3 block z-50 font-normal leading-normal text-sm max-w-xs text-left no-underline break-words rounded-lg">
          <div>
            <div class="text-gray-700 p-2">
              <p class="text-sm p-2 font-normal block w-full whitespace-nowrap bg-transparent text-gray-700 hover:bg-gray-100 rounded cursor-pointer" @click="toogleEditMode()">
                <PencilIcon class="app-icon-standard" /> Edit
              </p>
              <p class="text-sm p-2 font-normal block w-full whitespace-nowrap bg-transparent text-red-500 hover:bg-gray-100 rounded cursor-pointer" @click="onDeleteAction()">
                <TrashIcon class="app-icon-standard" /> Delete item
              </p>
            </div>
          </div>
        </div>
      </template>
    </Popper>
  </div>

  <div v-if="!state.item.id">Loading...</div>

  <div v-if="state.item.id" class="p-2">
    <div class="pb-2 flex flex-row w-full">
      <input v-if="state.isEditMode" v-model="state.item.title" type="text" placeholder="Title" class="app-input w-full text-xl" />
      <span v-else class="w-full text-xl">{{ state.item.title }}</span>
    </div>

    <div class="pb-2 flex flex-row w-full">
      <textarea v-if="state.isEditMode" v-model="state.item.description" rows="5" type="text" placeholder="Description" class="app-input w-full h-auto" />
      <span v-else class="w-full">{{ state.item.description }}</span>
    </div>

    <div class="pb-2 flex flex-row w-full items-center">
      <div>
        <vue-tags-input v-if="state.isEditMode" v-model="state.tag" placeholder="add tags..." :tags="state.tags" @tags-changed="(newTags) => (state.tags = newTags)" />
        <div v-else>
          <span v-for="tagItem in state.item.tags" :key="tagItem" class="app-chip-simple">{{ tagItem }}</span>
        </div>
      </div>

      <span class="flex-grow"></span>

      <v-date-picker v-if="state.item.status != FinisherItemStatus.Finished && state.item.startDate && state.isEditMode" v-model="state.item.startDate">
        <template #default="{ togglePopover }">
          <div class="flex flex-wrap">
            <button class="app-btn-datepicker" @click.stop="dateSelected($event, togglePopover)">
              {{ state.item.startDate.toLocaleDateString() }}
            </button>
          </div>
        </template>
      </v-date-picker>
    </div>

    <div class="mt-4 mb-4 flex flex-row w-full border-b border-opacity-25"></div>

    <Modal ref="modalDeleteRef" title="Confirm deletion">
      <template #body>Are you sure you want to delete this item? </template>
      <template #footer>
        <div class="mx-4 mb-4 flex flex-row-reverse">
          <button class="app-btn-secondary" @click="modalDeleteRef.toggleModal(false)">Cancel</button>
          <button class="app-btn-danger" @click="deleteItem()">Delete</button>
        </div>
      </template>
    </Modal>

    <Modal v-if="state.item.status != FinisherItemStatus.Finished" ref="modalChangeStatusRef" :title="state.item.status == FinisherItemStatus.Planning ? 'Start item' : 'Finish item'">
      <template #body>
        <span v-if="state.item.status == FinisherItemStatus.Planning">Start the item at</span>
        <span v-if="state.item.status == FinisherItemStatus.Started">Finish the item at</span>
        <!-- TODO: move this to a dedicated component -->
        <v-date-picker v-model="state.itemStatusDate" class="inline-block">
          <template #default="{ togglePopover }">
            <div class="flex flex-wrap">
              <button class="app-btn-datepicker" @click.stop="dateSelected($event, togglePopover)">
                {{ $filters.formatDate(state.itemStatusDate) }}
              </button>
            </div>
          </template>
        </v-date-picker>
      </template>
      <template #footer>
        <div class="mx-4 mb-4 flex flex-row-reverse">
          <button class="app-btn-secondary" @click="modalChangeStatusRef.toggleModal(false)">Cancel</button>
          <button class="app-btn-danger" @click="changeItemStatus()">{{ state.item.status == FinisherItemStatus.Planning ? 'Start' : 'Finish' }}</button>
        </div>
      </template>
    </Modal>

    <!-- Logs Sections -->
    <div v-if="state.item.status != FinisherItemStatus.Finished">
      <div class="pb-2 flex flex-row w-full">
        <span class="mr-4"
          >Today <br />
          {{ $filters.formatDate(new Date()) }}</span
        >
        <textarea v-model="state.newLog" rows="5" type="text" placeholder="Add logs for today..." class="app-input-border h-auto flex-grow" />
      </div>

      <div class="flex flex-row-reverse mt-2">
        <button :disabled="!state.newLog" class="app-btn-primary" @click="addLog()">Add Log</button>
      </div>
    </div>

    <div v-for="log in state.item.logs" :key="log.id" class="pb-2 mt-4 mb-4 flex flex-row justify-start">
      <div class="mr-2">
        <p class="app-chip-simple h-6 w-24">{{ $filters.formatDate(log.createdDate) }}</p>
      </div>
      <div>
        <p>{{ log.content }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="postcss">
  .no-border-bottom {
    @apply border-b-0 !important;
  }
</style>
