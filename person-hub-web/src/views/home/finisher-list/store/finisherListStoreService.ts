import store from '@/store/index'
import FinisherItem from '../api-services/models/FinisherItem'
import { FinisherListModuleStoreState, finisherListStore } from './finisher-list-store'

const state = store.state['finisherList'] as FinisherListModuleStoreState

class FinisherListStoreService {
  updateFinisherItems(items: Array<FinisherItem>) {
    store.commit(`finisherList/${finisherListStore.mutations.updateFinisherItems.name}`, items)
  }

  state = state
}

export default new FinisherListStoreService()
