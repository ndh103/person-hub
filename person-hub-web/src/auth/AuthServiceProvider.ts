/* eslint-disable @typescript-eslint/camelcase */
import Auth0AuthService from "./Auth0AuthService";
import AuthServiceInterface from "./AuthServiceInterface";
import MsalAuthService from "./MsalAuthService";

let instance: AuthServiceInterface = null;

const ensureLoaded = async() => {
    return new Promise(function (resolve) {
        (function waitForInstanceLoaded(){
            if (instance && !instance.loading) return resolve(true);
            setTimeout(waitForInstanceLoaded, 30);
        })();
    });
}

export const getAuthServiceInstance = async (): Promise<AuthServiceInterface> => {
    if (instance && !instance.loading) return instance;
    await ensureLoaded();
    return instance;
}

/** Creates an instance of the Auth0 SDK. If one has already been created, it returns that instance */
const useAuth = async (authOptions) => {
    if (instance) return instance;

    if(process.env.VUE_APP_AUTH_TYPE == "Auth0"){
        instance = new Auth0AuthService();
    }
    else{
        instance = new MsalAuthService();
    }

    await instance.init(authOptions);

    return instance;
};

// Create a simple Vue plugin to expose the wrapper object throughout the application
export const AuthPlugin = {
    async install(Vue, authOptions) {
        Vue.prototype.$auth = await useAuth(authOptions);
    }
};