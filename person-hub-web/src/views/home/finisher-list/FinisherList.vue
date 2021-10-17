<template>
  <QuickAddForm ref="quickAddForm" @on-new-item-added="addNewItem($event)" />

  <!-- Action bar -->
  <div v-if="!isQuickAddFormOpen" class="flex">
    <span class="app-action-link" @click="openForm()">
      <PlusIcon class="inline-block h-4 w-4" />
      <span>Add new item</span>
    </span>
    <span class="flex-grow"></span>
    <span class="hover:cursor-pointer hover:text-green-700 text-green-500 mb-4" @click="fetchItems()">
      <RefreshIcon class="h-4 w-4 inline-block" />
      Refresh
    </span>
  </div>

  <div v-for="(item, index) in items" :key="index" class="item-row border-b border-gray-400 px-4 py-2 mb-2 border-opacity-25">
    <div class="pb-2">
      <span class="cursor-pointer hover:text-green-700" @click="gotoDetails(item.id)">{{ item.title }}</span>
    </div>

    <div class="flex justify-between">
      <span class="text-xs self-end">{{ $filters.formatDate(item.startDate) }}</span>

      <div>
        <span v-for="(tag, tagIndex) in item.tags" :key="tagIndex" class="app-chip-s1 mt-1 hidden sm:inline-block">{{ tag }}</span>
      </div>
      <span :id="'popper-button' + index" class="w-4 h-4">
        <DotsHorizontalIcon title="open action menu" class="w-4 h-4 cursor-pointer hidden action-menu" @click="openPopperMenu('popperMenu' + index)" />
      </span>
      <Popper
        :id="'popper-menu' + index"
        :ref="'popperMenu' + index"
        :trigger-element-selector="'#popper-button' + index"
        :popper-element-selector="'#popper-menu' + index"
        placement="left"
      >
        <template #body>
          <div class="bg-white border mr-3 block z-50 font-normal leading-normal text-sm max-w-xs text-left no-underline break-words rounded-lg">
            <div>
              <div class="text-gray-700 p-2">
                <p
                  class="text-sm p-2 font-normal block w-full whitespace-nowrap bg-transparent text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                  @click="gotoDetails(item.id)"
                >
                  <ArrowRightIcon class="w-4 h-4 inline-block" /> Go to details
                </p>
                <p
                  class="text-sm p-2 font-normal block w-full whitespace-nowrap bg-transparent text-red-500 hover:bg-gray-100 rounded cursor-pointer"
                  @click="onDeleteAction(item)"
                >
                  <TrashIcon class="w-4 h-4 inline-block" /> Delete item
                </p>
              </div>
            </div>
          </div>
        </template>
      </Popper>
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
    props: {},
    data() {
      return {
        toBeDeletedItemId: 0,
      }
    },
    computed: {
      items(): Array<FinisherItem> {
        return finisherListStoreService.state.finisherItems as Array<FinisherItem>
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
    },
    async created() {
      // first time, fetch the list
      if (!this.items || this.items.length == 0) {
        await this.fetchItems()
      }

      //TODO: those logic should be reusable
      // If events data already loaded and the events list has been outdated for 5 mins --> fetch the list again
      if (finisherListStoreService.state.finisherItemsUpdatedTime) {
        var MILISECONDS_IN_MINUTE = 1000 * 60
        var now = dayjs()
        var updatedTime = dayjs(finisherListStoreService.state.finisherItemsUpdatedTime)
        const diffMinutes = now.diff(updatedTime) / MILISECONDS_IN_MINUTE

        if (diffMinutes > 5) {
          await this.fetchItems()
        }
      }
    },
    methods: {
      async addNewItem(item: FinisherItem) {
        var response = await finisherItemApiService.add(item, true)

        if (response) {
          item.id = (response.data as FinisherItem).id
        }

        var updatedItems = [...this.items]
        updatedItems.unshift(item)

        finisherListStoreService.updateFinisherItems(updatedItems)
      },
      async removeItem(item: FinisherItem) {
        var response = await finisherItemApiService.delete(item.id, true)

        if (response) {
          var updatedItems = [...this.items].filter((r) => r.id != item.id)
          finisherListStoreService.updateFinisherItems(updatedItems)
        }
      },
      async fetchItems() {
        var query = new FinisherItemQuery()
        query.limit = 100
        query.offset = 0

        var response = await finisherItemApiService.query(query, true)
        if (response) {
          var responseItems = response.data as Array<FinisherItem>
          finisherListStoreService.updateFinisherItems(responseItems)
        }
      },
      gotoDetails(itemId: number) {
        this.$router.push({
          name: 'finisher-item-details',
          params: { itemId: itemId },
        })
      },
      openForm() {
        var form = this.$refs.quickAddForm as any
        form.openForm()
      },
      openPopperMenu(refName) {
        var menu = this.$refs[refName] as any
        menu.togglePopper(true)
      },
      closePopperMenu(refName) {
        var menu = this.$refs[refName] as any
        menu.togglePopper(false)
      },
      onDeleteAction(item) {
        this.toBeDeletedItemId = item.id
        this.deleteModal.toggleModal(true)
      },
      cancelDelete() {
        this.toBeDeletedItemId = 0
        this.deleteModal.toggleModal(false)
      },
      async deleteItem() {
        this.deleteModal.toggleModal(false)
        var response = await finisherItemApiService.delete(this.toBeDeletedItemId, true)

        if (response) {
          var updatedItems = [...finisherListStoreService.state.finisherItems]
          updatedItems = updatedItems.filter((r) => r.id != this.toBeDeletedItemId)

          finisherListStoreService.updateFinisherItems(updatedItems)
        }

        // Reset tobe deleted Id
        this.toBeDeletedItemId = 0
      },
    },
  })
</script>

<style scoped lang="postcss">
  .item-row:hover .action-menu {
    display: inline-block;
  }
</style>