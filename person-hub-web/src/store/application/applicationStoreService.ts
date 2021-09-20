import store from '../index'
import applicationStoreConstant from './application-store-constant'

class AppStoreService {
  toggleLoading(showLoading: boolean): void {
    store.commit(
      `application/${applicationStoreConstant.MUTATIONS.toggleLoading}`,
      showLoading
    )
  }

  toggleSideBar(): void {
    store.commit(
      `application/${applicationStoreConstant.MUTATIONS.toggleSideBar}`
    )
  }
}

export default new AppStoreService()
