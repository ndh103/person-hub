import store from '@/store/index'
import FinisherItem from '../api-services/models/FinisherItem'
import FinisherItemStatus from '../api-services/models/FinisherItemStatus'
import { FinisherListModuleStoreState, finisherListStore } from './finisher-list-store'

const state = store.state['finisherList'] as FinisherListModuleStoreState

class FinisherListStoreService {
  updateFinisherItemsByStatus(payload: { items: Array<FinisherItem>; filteredStatus: FinisherItemStatus }) {
    store.commit(`finisherList/${finisherListStore.mutations.updateFinisherItemsByStatus.name}`, payload)
  }

  updateFilteredStatus(filteredStatus: FinisherItemStatus) {
    store.commit(`finisherList/${finisherListStore.mutations.updateFilteredStatus.name}`, filteredStatus)
  }

  addFinisherItem(item: FinisherItem) {
    store.commit(`finisherList/${finisherListStore.mutations.addFinisherItem.name}`, item)
  }

  removeFinisherItem(itemId: number) {
    store.commit(`finisherList/${finisherListStore.mutations.removeFinisherItem.name}`, itemId)
  }

  updateFinisherItem(item: FinisherItem) {
    store.commit(`finisherList/${finisherListStore.mutations.updateFinisherItem.name}`, item)
  }

  state = state
}

export default new FinisherListStoreService()
