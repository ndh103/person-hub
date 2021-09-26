import axios from 'axios'
import AuthServiceInterface from '@/auth/AuthServiceInterface'
import VueRouter from 'vue-router'
import VueAppFilters from '@/globals/filters/app-filters'

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $http: typeof axios
    $auth: AuthServiceInterface
    $router: VueRouter
    $filters: VueAppFilters
  }
}
