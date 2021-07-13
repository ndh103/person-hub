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
  audience:  process.env.VUE_APP_AUTH0_AUDIENCE,
  redirect_uri: window.location.origin,
  scope: 'openid profile email',
  response_type: 'token id_token',
  onRedirectCallback: appState => {
    router.push(
      appState && appState.targetUrl
        ? appState.targetUrl
        : window.location.pathname
    );
  }
};

Vue.use(Auth0Plugin, options);

// Router to handle authentication flow
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth) {
    const authService = await getAuthServiceInstance();

    // If the user is authenticated, continue with the route
    if (authService.isAuthenticated) {
      return next();
    }

    // Otherwise, log in
    authService.loginWithRedirect({ appState: { targetUrl: to.fullPath } });

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