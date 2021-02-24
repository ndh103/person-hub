/* eslint-disable */
import Oidc from "oidc-client"
import { isJSDocReturnTag } from "typescript"

var userManager = new Oidc.UserManager({
  userStore: new Oidc.WebStorageStateStore(),
  authority: "https://localhost:5001",
  client_id: "web-client",
  redirect_uri: window.location.origin + "/auth/callback",
  response_type: "id_token token",
  scope: "openid profile api",
  post_logout_redirect_uri: window.location.origin + "/",
  silent_redirect_uri: window.location.origin + "/auth/silent-renew",
  accessTokenExpiringNotificationTime: 10,
  automaticSilentRenew: true,
  filterProtocolClaims: true,
  loadUserInfo: true,
})

Oidc.Log.logger = console
Oidc.Log.level = Oidc.Log.INFO

userManager.events.addUserLoaded(function(user) {
  console.log("New User Loaded：", arguments)
  console.log("Acess_token: ", user.access_token)
})

userManager.events.addAccessTokenExpiring(function() {
  console.log("AccessToken Expiring：", arguments)
})

userManager.events.addAccessTokenExpired(function() {
  console.log("AccessToken Expired：", arguments)
  alert("Session expired. Going out!")
  userManager
    .signoutRedirect()
    .then(function(resp) {
      console.log("signed out", resp)
    })
    .catch(function(err) {
      console.log(err)
    })
})

userManager.events.addSilentRenewError(function() {
  console.error("Silent Renew Error：", arguments)
})

userManager.events.addUserSignedOut(function() {
  alert("Going out!")
  console.log("UserSignedOut：", arguments)
  userManager
    .signoutRedirect()
    .then(function(resp) {
      console.log("signed out", resp)
    })
    .catch(function(err) {
      console.log(err)
    })
})

class AuthService {
  // Renew the token manually
  renewToken() {
    let self = this
    return new Promise((resolve, reject) => {
      userManager
        .signinSilent()
        .then(function(user) {
          if (user == null) {
            self.signIn(null)
          } else {
            return resolve(user)
          }
        })
        .catch(function(err) {
          console.log(err)
          return reject(err)
        })
    })
  }

  // Get the user who is logged in
  getUser() {
    return userManager.getUser()
  }

  // Check if there is any user logged in
  signInIfHasNot() {
    var self = this;
    return userManager
      .getUser()
      .then(function(user) {
        if (user == null) {
          self.signinRedirect()
        }
      })
      .catch(function(err) {
        console.log(err)
      })
  }

  // Redirect of the current window to the authorization endpoint.
  signinRedirect() {
    userManager.signinRedirect().catch(function(err) {
      console.log(err)
    })
  }

  signinRedirectCallback() {
    return userManager.signinRedirectCallback()
  }

  signinSilentCallback() {
    return userManager.signinSilentCallback()
  }

  // Redirect of the current window to the end session endpoint
  signoutRedirect() {
    return userManager
      .signoutRedirect()
      .then(function(resp) {
        console.log("signed out", resp)
      })
      .catch(function(err) {
        console.log(err)
      })
  }
}

var authService = new AuthService();
export default authService;
