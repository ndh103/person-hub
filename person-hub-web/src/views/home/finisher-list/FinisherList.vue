<template>
  <!-- Action bar -->
  <div v-if="!isQuickAddFormOpen" class="flex px-2 pb-2 pt-4 top-10 sticky bg-white">
    <div class="app-btn-group-container" role="group">
      <button :class="[filteredStatus == FinisherItemStatus.Planning ? 'btn-group-active' : '']" class="app-btn-group-left" @click="filterByStatus(FinisherItemStatus.Planning)">
        Planning
      </button>
      <button :class="[filteredStatus == FinisherItemStatus.Started ? 'btn-group-active' : '']" class="app-btn-group-center" @click="filterByStatus(FinisherItemStatus.Started)">
        Started
      </button>
      <button :class="[filteredStatus == FinisherItemStatus.Finished ? 'btn-group-active' : '']" class="app-btn-group-right" @click="filterByStatus(FinisherItemStatus.Finished)">
        Finished
      </button>
    </div>
    <span class="flex-grow"></span>
    <span class="app-action-link mr-2" @click="openForm()">
      <PlusIcon class="app-icon-standard" />
      <span>Add new</span>
    </span>
    <span class="hover:cursor-pointer hover:text-green-700 text-green-500 mb-4" @click="fetchItems(filteredStatus)">
      <RefreshIcon class="app-icon-standard" />
      Refresh
    </span>
  </div>

  <QuickAddForm ref="quickAddForm" @on-new-item-added="addNewItem($event)" />

  <!-- Item List -->
  <div>
    <div v-for="(item, index) in items" :key="index" class="item-row border-b border-gray-400 px-4 py-2 mb-2 border-opacity-25">
      <div class="pb-2">
        <span class="cursor-pointer hover:text-green-700" @click="gotoDetails(item.id)">{{ item.title }}</span>
      </div>

      <div class="flex justify-between">
        <span v-if="item.startDate" class="text-xs self-end">{{ $filters.formatDate(item.startDate) }}</span>

        <div>
          <span v-for="(tag, tagIndex) in item.tags" :key="tagIndex" class="app-chip-simple mt-1 hidden sm:inline-block">{{ tag }}</span>
        </div>
        <span id="popperMenuButton" class="w-4 h-4">
          <DotsHorizontalIcon title="open action menu" class="app-icon-standard cursor-pointer hidden action-menu" @click="openPopperMenu(item.id)" />
        </span>
      </div>
    </div>

    <Modal ref="deleteModal" title="Confirm deletion">
      <template #body>Are you sure you want to delete this item? </template>
      <template #footer>
        <div class="mx-4 mb-4 flex flex-row-reverse">
          <button class="app-btn-secondary" @click="cancelDelete()">Cancel</button>
          <button class="app-btn-danger" @click="deleteItem()">Delete</button>
        </div>
      </template>
    </Modal>

    <Popper id="popperMenu" ref="popperMenu" trigger-element-selector="#popperMenuButton" popper-element-selector="#popperMenu" placement="left">
      <template #body>
        <div class="bg-white border mr-3 block z-50 font-normal leading-normal text-sm max-w-xs text-left no-underline break-words rounded-lg">
          <div>
            <div class="text-gray-700 p-2">
              <p
                class="text-sm p-2 font-normal block w-full whitespace-nowrap bg-transparent text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                @click="gotoDetails(currentPopperMenuItemId)"
              >
                <ArrowRightIcon class="app-icon-standard" /> Go to details
              </p>
              <p
                class="text-sm p-2 font-normal block w-full whitespace-nowrap bg-transparent text-red-500 hover:bg-gray-100 rounded cursor-pointer"
                @click="onDeleteAction(currentPopperMenuItemId)"
              >
                <TrashIcon class="app-icon-standard" /> Delete item
              </p>
            </div>
          </div>
        </div>
      </template>
    </Popper>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import dayjs from 'dayjs'

  import finisherItemApiService from './api-services/finisherItemApiService'
  import finisherListStoreService from './store/finisherListStoreService'

  import FinisherItem from './api-services/models/FinisherItem'
  import FinisherItemQuery from './api-services/models/FinisherItemQuery'

  import QuickAddForm from './QuickAddForm.vue'
  import Popper from '@/components/Popper.vue'
  import Modal from '@/components/Modal.vue'

  import RefreshIcon from '@/assets/refresh-icon.svg?component'
  import PlusIcon from '@/assets/plus-icon.svg?component'
  import DotsHorizontalIcon from '@/assets/dots-horizontal-icon.svg?component'

  import TrashIcon from '@/assets/trash-icon.svg?component'
  import ArrowRightIcon from '@/assets/arrow-right-icon.svg?component'
  import FinisherItemStatus from './api-services/models/FinisherItemStatus'

  export default defineComponent({
    components: {
      QuickAddForm,
      DotsHorizontalIcon,
      RefreshIcon,
      PlusIcon,
      Popper,
      TrashIcon,
      ArrowRightIcon,
      Modal,
    },
    data() {
      return {
        toBeDeletedItemId: 0,
        currentPopperMenuItemId: 0,
      }
    },
    computed: {
      filteredStatus() {
        return finisherListStoreService.state.filteredStatus
      },
      items(): Array<FinisherItem> {
        return finisherListStoreService.state.finisherItems.filter((r) => r.status == this.filteredStatus)
      },
      quickAddForm() {
        return this.$refs.quickAddForm as any
      },
      isQuickAddFormOpen() {
        if (this.$refs) {
          var form = this.$refs.quickAddForm as any
          return form?.isFormOpen
        }
        return false
      },
      deleteModal() {
        return this.$refs.deleteModal as any
      },
      FinisherItemStatus() {
        return FinisherItemStatus
      },
      popperMenu() {
        return this.$refs.popperMenu as any
      },
    },
    async created() {
      await this.fetchItemsWhenOutdated(this.filteredStatus)
    },
    methods: {
      async addNewItem(item: FinisherItem) {
        var response = await finisherItemApiService.add(item, true)

        if (response) {
          item.id = (response.data as FinisherItem).id
        }

        finisherListStoreService.addFinisherItem(item)
      },
      async deleteItem() {
        this.deleteModal.toggleModal(false)
        var response = await finisherItemApiService.delete(this.toBeDeletedItemId, true)

        if (response) {
          finisherListStoreService.removeFinisherItem(this.toBeDeletedItemId)
        }

        // Reset tobe deleted Id
        this.toBeDeletedItemId = 0
      },
      async fetchItems(status: FinisherItemStatus) {
        var query = new FinisherItemQuery()
        query.limit = 100
        query.offset = 0
        query.status = status

        var response = await finisherItemApiService.query(query, true)
        if (response) {
          var responseItems = response.data as Array<FinisherItem>

          if (status == FinisherItemStatus.Finished)
            // Sort by FinshDate Descending
            responseItems.sort((first, second) => {
              if (first.finishDate < second.finishDate) {
                return 1
              }

              if (first.finishDate > second.finishDate) {
                return -1
              }
              return 0
            })
        }

        finisherListStoreService.updateFinisherItemsByStatus({
          items: responseItems,
          filteredStatus: status,
        })
      },
      async fetchItemsWhenOutdated(status: FinisherItemStatus) {
        var fetchTimeByStatus = finisherListStoreService.state.itemFetchTimeByStatus[status]

        // If events data already loaded and the events list has been outdated for 5 mins --> fetch the list again
        if (fetchTimeByStatus) {
          var MILISECONDS_IN_MINUTE = 1000 * 60
          var now = dayjs()
          var fetchTime = dayjs(fetchTimeByStatus)
          const diffMinutes = now.diff(fetchTime) / MILISECONDS_IN_MINUTE

          if (diffMinutes > 5) {
            await this.fetchItems(status)
          }
        } else {
          await this.fetchItems(status)
        }
      },

      gotoDetails(itemId: number) {
        this.$router.push({
          name: 'finisher-item-details',
          params: { itemId: itemId },
        })
      },
      openForm() {
        this.quickAddForm.openForm()
      },
      openPopperMenu(itemId: number) {
        this.currentPopperMenuItemId = itemId

        this.popperMenu.togglePopper(true)
      },
      closePopperMenu() {
        this.popperMenu.togglePopper(false)
      },
      onDeleteAction(itemId: number) {
        this.toBeDeletedItemId = itemId
        this.deleteModal.toggleModal(true)
      },
      cancelDelete() {
        this.toBeDeletedItemId = 0
        this.deleteModal.toggleModal(false)
      },
      async filterByStatus(status: FinisherItemStatus) {
        finisherListStoreService.updateFilteredStatus(status)
        this.fetchItemsWhenOutdated(status)
      },
    },
  })
</script>

<style scoped lang="postcss">
  .item-row:hover .action-menu {
    display: inline-block;
  }

  .btn-group-active {
    @apply bg-green-500 text-white;
  }
</style>
