import Vue from 'vue'
import Vuex from 'vuex'

import applicationStore from './application/application-store'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
  },
  mutations: {
  },
  actions: {
  },
  modules: {
    "application": applicationStore
  }
})
