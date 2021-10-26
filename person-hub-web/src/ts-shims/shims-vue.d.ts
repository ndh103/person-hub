import axios from 'axios'
import AuthServiceInterface from '@/auth/AuthServiceInterface'
import VueRouter from 'vue-router'
import VueAppFilters from '@/globals/filters/app-filters'
import { Store } from 'vuex'

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $http: typeof axios
    $auth: AuthServiceInterface
    $router: VueRouter
    $filters: VueAppFilters
  }

  // declare your own store states
  interface State {
    count: number
  }

  // provide typings for `this.$store`
  interface ComponentCustomProperties {
    $store: Store<State>
  }
}
