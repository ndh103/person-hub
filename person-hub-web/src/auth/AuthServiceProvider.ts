import Auth0AuthService from './Auth0AuthService'
import AuthServiceInterface from './AuthServiceInterface'

let instance: AuthServiceInterface = null

const ensureLoaded = async () => {
  return new Promise(function (resolve) {
    ;(function waitForInstanceLoaded() {
      if (instance && !instance.loading) return resolve(true)
      setTimeout(waitForInstanceLoaded, 30)
    })()
  })
}

export const getAuthServiceInstance = async (): Promise<AuthServiceInterface> => {
  if (instance && !instance.loading) return instance
  await ensureLoaded()
  return instance
}

/** Creates an instance of the Auth0 SDK. If one has already been created, it returns that instance */
const useAuth = async (authOptions) => {
  if (instance) return instance

  instance = new Auth0AuthService()

  await instance.init(authOptions)

  return instance
}

// Create a simple Vue plugin to expose the wrapper object throughout the application
export const AuthPlugin = {
  install: async (app, options) => {
    app.config.globalProperties.$auth = await useAuth(options)
  },
}
