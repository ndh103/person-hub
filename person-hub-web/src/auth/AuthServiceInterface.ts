/* eslint-disable @typescript-eslint/no-explicit-any */

import UserInfo from './UserInfo'

interface AuthServiceInterface {
  loading: boolean
  isAuthenticated: boolean
  user: UserInfo
  popupOpen: boolean
  error: any

  /** Authenticates the user using the redirect method */
  loginWithRedirect(options?): Promise<void>

  /** Logs the user out and removes their session on the authorization server */
  logout(options?): void | Promise<void>

  getTokenSilently(o?): Promise<string>

  getUser(): Promise<any>

  isUserAuthenticated(): Promise<boolean>

  init(options): Promise<void>
}

export default AuthServiceInterface
