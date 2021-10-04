export class AppModuleStoreState {
  loggedInUser: any = {}
  overlaySidebarStatus = 'closed'
  isLoading = false
}

const mutations = {
  setLoggedInUser(state: AppModuleStoreState, user: unknown): void {
    state.loggedInUser = user
  },

  toggleSideBar(state: AppModuleStoreState, isOpen: boolean | null): void {
    if (isOpen == null) {
      if (state.overlaySidebarStatus == 'open') {
        state.overlaySidebarStatus = 'closed'
      } else {
        state.overlaySidebarStatus = 'open'
      }
    } else {
      state.overlaySidebarStatus = isOpen ? 'open' : 'closed'
    }
  },

  toggleLoading(state: AppModuleStoreState, isLoading: boolean): void {
    state.isLoading = isLoading
  },
}

export const appModuleStore = {
  namespaced: true,
  state(): AppModuleStoreState {
    return new AppModuleStoreState()
  },
  getters: {
    loggedInUser(state: AppModuleStoreState): any {
      return state.loggedInUser
    },
    overlaySideBarStatus(state: AppModuleStoreState): string {
      return state.overlaySidebarStatus
    },
    isLoading(state: AppModuleStoreState): boolean {
      return state.isLoading
    },
  },
  mutations,
  actions: {
    testSetLoading(context, isLoading: boolean): void {
      context.commit(mutations.toggleLoading.name, isLoading)
    },
  },
}
