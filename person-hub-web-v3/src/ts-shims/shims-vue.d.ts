import axios from 'axios'
import AuthServiceInterface from '@/auth/AuthServiceInterface'
import VueRouter from 'vue-router'

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $http: typeof axios,
    $auth: AuthServiceInterface;
    $router: VueRouter;
  }
}