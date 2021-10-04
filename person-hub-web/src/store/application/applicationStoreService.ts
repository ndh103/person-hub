import store from '../index'
import { AppModuleStoreState, appModuleStore } from './application-store'

const state = store.state['application'] as AppModuleStoreState

class AppStoreGetters {}

class AppStoreService {
  toggleLoading(showLoading: boolean): void {
    // store.commit(`application/${mutations.toggleLoading.name}`, showLoading)
    store.dispatch(`application/${appModuleStore.actions.testSetLoading.name}`, showLoading)
  }

  toggleSideBar(isOpen: boolean | null = null): void {
    store.commit(`application/${appModuleStore.mutations.toggleSideBar.name}`, isOpen)
  }

  state: AppModuleStoreState = state

  getters: AppStoreGetters = new AppStoreGetters()
}

export default new AppStoreService()
