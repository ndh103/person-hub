import { createStore } from 'vuex'

import applicationStore from './application/application-store'

export default createStore({
  state: {},
  mutations: {},
  actions: {},
  modules: {
    application: applicationStore,
  },
})
