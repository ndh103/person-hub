<template>
  <div class="flex">
    <div class="app-action-link" @click="goBack()"><ArrowLeftIcon class="h-4 w-4 inline-block" /> back</div>
    <span class="flex-grow"></span>

    <button class="app-btn-primary" @click="save()">Save</button>
    <button class="app-btn-secondary" @click="cancel()">Cancel</button>
  </div>

  <div v-if="!item.id">Loading...</div>

  <div v-if="item.id" class="p-2 border-b-2">
    <div class="pb-2 flex flex-row w-full">
      <input v-model="item.title" type="text" placeholder="Title" class="app-input w-full text-xl" />
    </div>

    <div class="pb-2 flex flex-row w-full">
      <textarea v-model="item.description" rows="5" type="text" placeholder="Description" class="app-input w-full no-border-bottom h-auto" />
    </div>

    <div class="pb-2 flex flex-row w-full">
      <div class="flex justify-center items-center m-1 font-medium py-1 px-2 rounded-full text-blue-700 bg-blue-100 border border-blue-300">
        <div class="text-xs font-normal leading-none max-w-full flex-initial">{{ itemStatus }}</div>
      </div>
    </div>

    <div class="pb-2 flex flex-row w-full">
      <v-date-picker v-model="item.startDate">
        <template #default="{ togglePopover }">
          <div class="flex flex-wrap">
            <button class="app-btn-datepicker" @click.stop="dateSelected($event, togglePopover)">
              {{ item.startDate.toLocaleDateString() }}
            </button>
          </div>
        </template>
      </v-date-picker>

      <vue-tags-input placeholder="add tags..." :tags="tags" @tags-changed="(newTags) => (tags = newTags)" />
    </div>

    <div class="flex flex-row-reverse">
      <button class="app-btn-primary" @click="onFinishItem()">Mark as done</button>
      <button class="app-btn-danger" @click="onDeleteAction()">Remove item</button>
    </div>

    <Modal ref="modalDelete" title="Confirm deletion">
      <template #body>Are you sure you want to delete this item? </template>
      <template #footer>
        <div class="mx-4 mb-4 flex flex-row-reverse">
          <button class="app-btn-secondary" @click="modalDelete.toggleModal(false)">Cancel</button>
          <button class="app-btn-danger" @click="deleteItem()">Delete</button>
        </div>
      </template>
    </Modal>

    <Modal ref="modalFinish" title="Finish an item">
      <template #body>
        <div>Finish the item</div>
        <div>
          <!-- TODO: move this to a dedicated component -->
          <v-date-picker v-model="itemFinishDate">
            <template #default="{ togglePopover }">
              <div class="flex flex-wrap">
                <button class="app-btn-datepicker" @click.stop="dateSelected($event, togglePopover)">
                  {{ itemFinishDate.toLocaleDateString() }}
                </button>
              </div>
            </template>
          </v-date-picker>
        </div>
      </template>
      <template #footer>
        <div class="mx-4 mb-4 flex flex-row-reverse">
          <button class="app-btn-secondary" @click="modalFinish.toggleModal(false)">Cancel</button>
          <button class="app-btn-danger" @click="finishItem()">Finish</button>
        </div>
      </template>
    </Modal>
  </div>
</template>
<script lang="ts">
  import { defineComponent } from 'vue'
  import VueTagsInput from '@sipec/vue3-tags-input'
  import ArrowLeftIcon from '@/assets/arrow-left-icon.svg?component'
  import Modal from '@/components/Modal.vue'
  import FinisherItem from './api-services/models/FinisherItem'
  import finisherItemApiService from './api-services/finisherItemApiService'
  import finisherListStoreService from './store/finisherListStoreService'
  import FinisherItemStatus from './api-services/models/FinisherItemStatus'

  export default defineComponent({
    components: {
      VueTagsInput,
      ArrowLeftIcon,
      Modal,
    },
    props: {
      itemId: {
        type: Number,
        default: 0,
      },
    },
    data() {
      return {
        item: new FinisherItem(),
        tag: '',
        tags: [],
        itemFinishDate: new Date(),
      }
    },
    computed: {
      modalDelete() {
        return this.$refs.modalDelete as any
      },
      modalFinish() {
        return this.$refs.modalFinish as any
      },
      itemStatus() {
        return FinisherItemStatus[this.item.status]
      },
    },
    async created() {
      var response = await finisherItemApiService.get(this.itemId, false)

      if (response) {
        this.item = response.data as FinisherItem

        this.item.startDate = new Date(this.item.startDate)

        this.tags = this.item.tags.map((tag) => {
          return {
            text: tag,
          }
        })
      }
    },
    methods: {
      async save() {
        this.item.tags = this.tags.map((r) => r.text)

        var response = await finisherItemApiService.update(this.itemId, this.item, true)

        // Update the event in the store
        if (response) {
          var updatedItems = [...finisherListStoreService.state.finisherItems]
          updatedItems[updatedItems.findIndex((r) => r.id == this.item.id)] = { ...this.item }

          finisherListStoreService.updateFinisherItems(updatedItems)
        }
      },
      cancel() {
        this.goBack()
      },
      goBack() {
        this.$router.push({
          name: 'finisher-list-view',
        })
      },
      dateSelected(e, toogleFunc) {
        toogleFunc({ ref: e.target })
      },
      onDeleteAction() {
        this.modalDelete.toggleModal(true)
      },
      onFinishItem() {
        this.itemFinishDate = new Date()
        this.modalFinish.toggleModal(true)
      },
      async deleteItem() {
        this.modalDelete.toggleModal(false)
        var response = await finisherItemApiService.delete(this.itemId, true)

        if (response) {
          var updateItems = [...finisherListStoreService.state.finisherItems]
          updateItems = updateItems.filter((r) => r.id != this.itemId)

          finisherListStoreService.updateFinisherItems(updateItems)
          this.goBack()
        }
      },
      async finishItem() {
        this.modalFinish.toggleModal(false)

        var response = await finisherItemApiService.finish(this.itemId, { finishDate: this.itemFinishDate }, true)

        if (response) {
          var updatedItems = [...finisherListStoreService.state.finisherItems]
          updatedItems[updatedItems.findIndex((r) => r.id == this.item.id)] = { ...this.item }

          finisherListStoreService.updateFinisherItems(updatedItems)
        }
      },
    },
  })
</script>

<style scoped lang="postcss">
  .no-border-bottom {
    @apply border-b-0 !important;
  }
</style>
