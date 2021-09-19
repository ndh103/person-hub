declare module '*.vue' {
  import Vue from 'vue'
  export default Vue
}

import AuthServiceInterface from '@/auth/AuthServiceInterface'
import VueRouter from 'vue-router'

declare module 'vue/types/vue' {
  interface Vue {
    $router: VueRouter;
    $auth: AuthServiceInterface;
  }
}