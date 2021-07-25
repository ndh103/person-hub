/* eslint-disable @typescript-eslint/camelcase */
import createAuth0Client, { Auth0Client, Auth0ClientOptions } from "@auth0/auth0-spa-js";

/** Define a default action to perform after authentication */
const DEFAULT_REDIRECT_CALLBACK = () =>
    window.history.replaceState({}, document.title, window.location.pathname);

let instance;

let options;

class AuthService {
    loading = true;
    isAuthenticated =  false;
    user: {};
    auth0Client: Auth0Client;
    popupOpen = false;
    error: null;

    /** Authenticates the user using a popup window */
    async loginWithPopup(options, config) {
        this.popupOpen = true;

        try {
            await this.auth0Client.loginWithPopup(options, config);
            this.user = await this.auth0Client.getUser();
            this.isAuthenticated = await this.auth0Client.isAuthenticated();
            this.error = null;
        } catch (e) {
            this.error = e;
            // eslint-disable-next-line
            console.error(e);
        } finally {
            this.popupOpen = false;
        }

        this.user = await this.auth0Client.getUser();
        this.isAuthenticated = true;
    }

    /** Handles the callback when logging in using a redirect */
    async handleRedirectCallback() {
        this.loading = true;
        try {
            await this.auth0Client.handleRedirectCallback();
            this.user = await this.auth0Client.getUser();
            this.isAuthenticated = true;
            this.error = null;
        } catch (e) {
            this.error = e;
        } finally {
            this.loading = false;
        }
    }

    /** Authenticates the user using the redirect method */
    loginWithRedirect(o) {
        return this.auth0Client.loginWithRedirect(o);
    }

    /** Returns all the claims present in the ID token */
    getIdTokenClaims(o) {
        return this.auth0Client.getIdTokenClaims(o);
    }

    /** Returns the access token. If the token is invalid or missing, a new one is retrieved */
    getTokenSilently(o) {
        return this.auth0Client.getTokenSilently(o);
    }

    /** Gets the access token using a popup window */
    getTokenWithPopup(o) {
        return this.auth0Client.getTokenWithPopup(o);
    }

    /** Logs the user out and removes their session on the authorization server */
    logout(o) {
        return this.auth0Client.logout(o);
    }

    async getUser() {
        return await this.auth0Client.getUser();
    }

    async isUserAuthenticated() {
        if (!this.loading) {
            return this.isAuthenticated;
        }
        
        return await this.auth0Client.isAuthenticated();
    }

    async init(options: Auth0ClientOptions) {
        // Create a new instance of the SDK client using members of the given options object
        this.auth0Client = await createAuth0Client(options);

        try {
            // If the user is returning to the app after authentication..
            if (
                window.location.search.includes("code=") &&
                window.location.search.includes("state=")
            ) {
                // handle the redirect and retrieve tokens
                const { appState } = await this.auth0Client.handleRedirectCallback();

                this.error = null;

                // Notify subscribers that the redirect callback has happened, passing the appState
                // (useful for retrieving any pre-authentication state)
                if(options.onRedirectCallback){
                    options.onRedirectCallback(appState);
                }else{
                    DEFAULT_REDIRECT_CALLBACK();
                }                
            }
        } catch (e) {
            this.error = e;
        } finally {
            // Initialize our internal authentication state
            this.isAuthenticated = await this.auth0Client.isAuthenticated();
            this.user = await this.auth0Client.getUser();
            this.loading = false;
        }
    }
}

const ensureLoaded = async() => {
    return new Promise(function (resolve) {
        (function waitForFoo(){
            if (!instance.loading) return resolve(true);
            setTimeout(waitForFoo, 30);
        })();
    });
}

/** Returns the current instance of the SDK */
export const getAuthServiceInstance = async () => {
    if (instance && !instance.loading) return instance;

    if(instance.loading){
        await ensureLoaded();
    }

    return instance;
}

/** Creates an instance of the Auth0 SDK. If one has already been created, it returns that instance */
const useAuth0 = async () => {
    if (instance) return instance;

    instance = new AuthService();
    await instance.init(options);

    return instance;
};

// Create a simple Vue plugin to expose the wrapper object throughout the application
export const Auth0Plugin = {
    async install(Vue, auth0Options) {
        options = auth0Options;
        Vue.prototype.$auth = await useAuth0();
    }
};