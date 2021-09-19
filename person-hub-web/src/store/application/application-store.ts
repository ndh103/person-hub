/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import AppStoreConstant from './application-store-constant'

const { ACTIONS, MUTATIONS, GETTERS } = AppStoreConstant

const applicationStore = {
  namespaced: true,
  state: () => ({
    loggedInUser: {},
    overlaySidebarStatus: 'closed',
    isLoading: false,
  }),
  mutations: {
    [MUTATIONS.setLoggedInUser](state, user) {
      state.loggedInUser = user
    },
    [MUTATIONS.toogleSidebar](state) {
      if (state.overlaySidebarStatus == 'open') {
        state.overlaySidebarStatus = 'closed'
      } else {
        state.overlaySidebarStatus = 'open'
      }
    },
    [MUTATIONS.toggleLoading](state, isLoading) {
      state.isLoading = isLoading
    },
  },
  getters: {
    [GETTERS.loggedInUser](state) {
      return state.loggedInUser
    },
    [GETTERS.overlaySideBarStatus](state) {
      return state.overlaySidebarStatus
    },
    [GETTERS.isLoading](state) {
      return state.isLoading
    },
  },
  actions: {
    [ACTIONS.setLoggedInUser](context, user) {
      context.commit(MUTATIONS.setLoggedInUser, user)
    },
  },
}

export default applicationStore
