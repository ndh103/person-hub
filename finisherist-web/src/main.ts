import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// Configure default global Http
import httpBase from './common/http-base';
Vue.prototype.$http = httpBase;

// Setup Tailwind
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./tailwind/tailwind.css";

Vue.config.productionTip = false

// Router to handle authentication flow
import authService from './auth/authService';
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  if (requiresAuth) {
    authService.signInIfHasNot();
  }
  next();
});

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')