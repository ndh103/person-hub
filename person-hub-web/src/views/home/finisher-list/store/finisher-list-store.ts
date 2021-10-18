import FinisherItem from '../api-services/models/FinisherItem'
import FinisherItemStatus from '../api-services/models/FinisherItemStatus'

export interface FinisherListModuleStoreState {
  finisherItems: Array<FinisherItem>
  itemFetchTimeByStatus: {
    0: Date // Planning
    1: Date // Started
    2: Date // Finished
  }
  filteredStatus: FinisherItemStatus
}

export const finisherListStore = {
  namespaced: true,
  state(): FinisherListModuleStoreState {
    return {
      finisherItems: new Array<FinisherItem>(),
      itemFetchTimeByStatus: {
        0: null,
        1: null,
        2: null,
      },
      filteredStatus: FinisherItemStatus.Started,
    }
  },
  mutations: {
    updateFinisherItemsByStatus(
      state: FinisherListModuleStoreState,
      payload: {
        items: Array<FinisherItem>
        filteredStatus: FinisherItemStatus
      }
    ): void {
      state.filteredStatus = payload.filteredStatus
      state.itemFetchTimeByStatus[payload.filteredStatus] = new Date()

      const otherTypesItems = state.finisherItems.filter((r) => r.status != payload.filteredStatus)
      state.finisherItems = [...payload.items, ...otherTypesItems]
    },

    updateFilteredStatus(state: FinisherListModuleStoreState, filteredStatus: FinisherItemStatus): void {
      state.filteredStatus = filteredStatus
    },

    addFinisherItem(state: FinisherListModuleStoreState, item: FinisherItem): void {
      state.finisherItems.unshift(item)
    },
    removeFinisherItem(state: FinisherListModuleStoreState, itemId: number): void {
      state.finisherItems = state.finisherItems.filter((r) => r.id != itemId)
    },
    updateFinisherItem(state: FinisherListModuleStoreState, item: FinisherItem): void {
      const index = state.finisherItems.findIndex((r) => r.id == item.id)
      state.finisherItems[index] = { ...item }
    },
  },
}
