import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import "./tailwind/tailwind.css"
import VueTailwind from 'vue-tailwind'
import tailwindSettings from './tailwind/tailwind-settings'

Vue.use(VueTailwind, tailwindSettings)

Vue.config.productionTip = false
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
