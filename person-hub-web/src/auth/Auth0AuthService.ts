import createAuth0Client, { Auth0Client, Auth0ClientOptions } from '@auth0/auth0-spa-js'
import AuthServiceInterface from './AuthServiceInterface'
import UserInfo from './UserInfo'

/** Define a default action to perform after authentication */
const DEFAULT_REDIRECT_CALLBACK = () => window.history.replaceState({}, document.title, window.location.pathname)

export default class Auth0AuthService implements AuthServiceInterface {
  loading = true
  isAuthenticated = false
  user = new UserInfo()
  auth0Client: Auth0Client
  popupOpen = false
  error: any

  /** Authenticates the user using the redirect method */
  loginWithRedirect(o): Promise<void> {
    return this.auth0Client.loginWithRedirect(o)
  }

  /** Logs the user out and removes their session on the authorization server */
  logout(o) {
    return this.auth0Client.logout(o)
  }

  /** Returns the access token. If the token is invalid or missing, a new one is retrieved */
  getTokenSilently(o): Promise<string> {
    return this.auth0Client.getTokenSilently(o)
  }

  async getUser() {
    return await this.auth0Client.getUser()
  }

  async isUserAuthenticated() {
    if (!this.loading) {
      return this.isAuthenticated
    }

    return await this.auth0Client.isAuthenticated()
  }

  async init(options: Auth0ClientOptions) {
    // Create a new instance of the SDK client using members of the given options object
    this.auth0Client = await createAuth0Client(options)

    try {
      // If the user is returning to the app after authentication..
      if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        // handle the redirect and retrieve tokens
        const { appState } = await this.auth0Client.handleRedirectCallback()

        this.error = null

        // Notify subscribers that the redirect callback has happened, passing the appState
        // (useful for retrieving any pre-authentication state)
        if (options.onRedirectCallback) {
          options.onRedirectCallback(appState)
        } else {
          DEFAULT_REDIRECT_CALLBACK()
        }
      }
    } catch (e) {
      this.error = e
    } finally {
      // Initialize our internal authentication state
      this.isAuthenticated = await this.auth0Client.isAuthenticated()
      this.user = await this.auth0Client.getUser()
      this.loading = false
    }
  }
}
