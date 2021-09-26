import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import '@/common/custom-extensions'

import '@fortawesome/fontawesome-free/css/all.min.css'
import './styles/index.css'
import VCalendar from 'v-calendar'

const app = createApp(App)

import httpBase from './common/http-base'
app.config.globalProperties.$http = httpBase

import { AuthPlugin, getAuthServiceInstance } from './auth/AuthServiceProvider'
import VueAppFilterPlugin from './globals/filters/app-filters'

//TODO: Move into the implement details of Auth0
const options = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  client_id: import.meta.env.VITE_AUTH0_CLIENTID,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  redirect_uri: window.location.origin,
  scope: 'openid profile email',
  response_type: 'token id_token',
  onRedirectCallback: (appState) => {
    router.push(
      appState && appState.targetUrl
        ? appState.targetUrl
        : window.location.pathname
    )
  },
}

app.use(AuthPlugin, options)

// Router to handle authentication flow
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth) {
    const authService = await getAuthServiceInstance()

    // If the user is authenticated, continue with the route
    if (authService.isAuthenticated) {
      return next()
    }

    // Otherwise, log in
    authService.loginWithRedirect({ appState: { targetUrl: to.fullPath } })
  } else {
    next()
  }
})

app.use(router)

app.use(store)

app.use(VueAppFilterPlugin)

// Additional Plugins
app.use(VCalendar)

app.mount('#app')
