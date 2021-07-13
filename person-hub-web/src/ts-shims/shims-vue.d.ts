declare module '*.vue' {
  import Vue from 'vue'
  export default Vue
}

import VueRouter from 'vue-router'
import AuthService from '@/auth0/auth'
declare module 'vue/types/vue' {
  interface Vue {
    $router: VueRouter;
    $auth: AuthService;
  }
}