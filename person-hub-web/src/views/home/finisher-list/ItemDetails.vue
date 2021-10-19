<template>
  <div class="flex">
    <div class="app-action-link" @click="goBack()"><ArrowLeftIcon class="h-4 w-4 inline-block" /> back</div>
    <span class="flex-grow"></span>

    <button class="app-btn-primary" @click="save()">Save</button>
    <button class="app-btn-secondary" @click="cancel()">Cancel</button>
  </div>

  <div v-if="!item.id">Loading...</div>

  <div v-if="item.id" class="p-2">
    <div class="pb-2 flex flex-row w-full">
      <input v-model="item.title" type="text" placeholder="Title" class="app-input w-full text-xl" />
    </div>

    <div class="pb-2 flex flex-row w-full">
      <textarea v-model="item.description" rows="5" type="text" placeholder="Description" class="app-input w-full no-border-bottom h-auto" />
    </div>

    <div class="pb-2 flex flex-row w-full items-center">
      <vue-tags-input placeholder="add tags..." :tags="tags" @tags-changed="(newTags) => (tags = newTags)" />

      <span class="flex-grow"></span>

      <span :class="itemStatusClass" class="h-6">{{ itemStatus }}</span>

      <v-date-picker v-if="item.status != FinisherItemStatus.Finished && item.startDate" v-model="item.startDate">
        <template #default="{ togglePopover }">
          <div class="flex flex-wrap">
            <button class="app-btn-datepicker" @click.stop="dateSelected($event, togglePopover)">
              {{ item.startDate.toLocaleDateString() }}
            </button>
          </div>
        </template>
      </v-date-picker>

      <span v-if="item.status == FinisherItemStatus.Finished" class="app-btn-datepicker">{{ formatDate(item.startDate) }} - {{ formatDate(item.finishDate) }}</span>
    </div>

    <div class="pb-6 mb-2 flex flex-row w-full border-b border-opacity-25"></div>

    <div class="flex flex-row-reverse">
      <button v-if="item.status == FinisherItemStatus.Planning" class="app-btn-primary" @click="onChangeStatusItem()">Start this item</button>
      <button v-if="item.status == FinisherItemStatus.Started" class="app-btn-primary" @click="onChangeStatusItem()">Mark as done</button>
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

    <Modal v-if="item.status != FinisherItemStatus.Finished" ref="modalChangeStatus" title="Finish an item">
      <template #body>
        <div v-if="item.status == FinisherItemStatus.Planning">Start the item</div>
        <div v-if="item.status == FinisherItemStatus.Started">Finish the item</div>
        <div>
          <!-- TODO: move this to a dedicated component -->
          <v-date-picker v-model="itemStatusDate">
            <template #default="{ togglePopover }">
              <div class="flex flex-wrap">
                <button class="app-btn-datepicker" @click.stop="dateSelected($event, togglePopover)">
                  {{ formatDate(itemStatusDate) }}
                </button>
              </div>
            </template>
          </v-date-picker>
        </div>
      </template>
      <template #footer>
        <div class="mx-4 mb-4 flex flex-row-reverse">
          <button class="app-btn-secondary" @click="modalChangeStatus.toggleModal(false)">Cancel</button>
          <button class="app-btn-danger" @click="changeItemStatus()">Finish</button>
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
  import dayjs from 'dayjs'

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
        itemStatusDate: new Date(),
      }
    },
    computed: {
      FinisherItemStatus() {
        return FinisherItemStatus
      },
      modalDelete() {
        return this.$refs.modalDelete as any
      },
      modalChangeStatus() {
        return this.$refs.modalChangeStatus as any
      },
      itemStatus() {
        return FinisherItemStatus[this.item.status]
      },
      itemStatusClass() {
        switch (this.item.status) {
          case FinisherItemStatus.Planning:
            return 'app-chip-simple'
          case FinisherItemStatus.Started:
            return 'app-chip-primary'
          case FinisherItemStatus.Finished:
            return 'app-chip-pink'
        }
        return ''
      },
    },
    async created() {
      var response = await finisherItemApiService.get(this.itemId, false)

      if (response) {
        this.item = response.data as FinisherItem
        if (this.item.startDate) {
          this.item.startDate = new Date(this.item.startDate)
        }

        if (this.item.finishDate) {
          this.item.finishDate = new Date(this.item.finishDate)
        }

        this.tags = this.item.tags.map((tag) => {
          return {
            text: tag,
          }
        })
      }
    },
    methods: {
      formatDate(date: Date) {
        return dayjs(date).format('DD MMM YY')
      },
      async save() {
        this.item.tags = this.tags.map((r) => r.text)

        var response = await finisherItemApiService.update(this.itemId, this.item, true)

        // Update the event in the store
        if (response) {
          finisherListStoreService.updateFinisherItem(this.item)
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
      onChangeStatusItem() {
        this.itemStatusDate = new Date()
        this.modalChangeStatus.toggleModal(true)
      },
      async deleteItem() {
        this.modalDelete.toggleModal(false)
        var response = await finisherItemApiService.delete(this.itemId, true)

        if (response) {
          finisherListStoreService.removeFinisherItem(this.itemId)
          this.goBack()
        }
      },
      async changeItemStatus() {
        this.modalChangeStatus.toggleModal(false)

        var response

        if (this.item.status == FinisherItemStatus.Planning) {
          response = await finisherItemApiService.start(this.itemId, { startDate: this.itemStatusDate }, true)

          if (response) {
            this.item.status = FinisherItemStatus.Started
            this.item.startDate = this.itemStatusDate
          }
        } else if (this.item.status == FinisherItemStatus.Started) {
          response = await finisherItemApiService.finish(this.itemId, { finishDate: this.itemStatusDate }, true)

          if (response) {
            this.item.status = FinisherItemStatus.Finished
            this.item.finishDate = this.itemStatusDate
          }
        } else {
          throw 'Status is not suported'
        }

        if (response) {
          finisherListStoreService.updateFinisherItem(this.item)
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
