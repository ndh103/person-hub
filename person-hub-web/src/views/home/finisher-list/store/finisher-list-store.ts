import FinisherItem from '../api-services/models/FinisherItem'

export interface FinisherListModuleStoreState {
  finisherItems: Array<FinisherItem>
  finisherItemsUpdatedTime: Date
}

export const finisherListStore = {
  namespaced: true,
  state(): FinisherListModuleStoreState {
    return {
      finisherItems: new Array<FinisherItem>(),
      finisherItemsUpdatedTime: null,
    }
  },
  mutations: {
    updateFinisherItems(state: FinisherListModuleStoreState, items: Array<FinisherItem>): void {
      state.finisherItems = [...items]
      state.finisherItemsUpdatedTime = new Date()
    },
  },
  actions: {},
}
