/* eslint-disable @typescript-eslint/camelcase */
import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store/index'


// Configure default global Http
import httpBase from './common/http-base';
Vue.prototype.$http = httpBase;

// Setup Tailwind
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./tailwind/tailwind.css";

Vue.config.productionTip = false

// Install the authentication plugin here
import { Auth0Plugin, getAuthServiceInstance } from './auth0/auth';

const options = {
  domain: process.env.VUE_APP_AUTH0_DOMAIN,
  client_id: process.env.VUE_APP_AUTH0_CLIENTID,
  redirect_uri: window.location.origin
};

Vue.use(Auth0Plugin, options);

// Router to handle authentication flow
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth) {
    const authService = getAuthServiceInstance();
    
    const fn = () => {
      // If the user is authenticated, continue with the route
      if (authService.isAuthenticated) {
        return next();
      }
  
      // Otherwise, log in
      authService.loginWithRedirect({ appState: { targetUrl: to.fullPath } });
    };
  
    // If loading has already finished, check our auth state using `fn()`
    if (!authService.loading) {
      return fn();
    }
  
    // Watch for the loading property to change before we check isAuthenticated
    authService.$watch("loading", loading => {
      if (loading === false) {
        return fn();
      }
    });
  }
  else{
    next();
  }
});

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')