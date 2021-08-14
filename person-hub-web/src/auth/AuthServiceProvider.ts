/* eslint-disable @typescript-eslint/camelcase */
import Auth0AuthService from "./Auth0AuthService";
import AuthServiceInterface from "./AuthServiceInterface";

let instance: AuthServiceInterface;
const authImplementation = "auth0";

const ensureLoaded = async() => {
    return new Promise(function (resolve) {
        (function waitForInstanceLoaded(){
            if (!instance.loading) return resolve(true);
            setTimeout(waitForInstanceLoaded, 30);
        })();
    });
}

export const getAuthServiceInstance = async (): Promise<AuthServiceInterface> => {
    if (instance && !instance.loading) return instance;

    if(instance.loading){
        await ensureLoaded();
    }

    return instance;
}

/** Creates an instance of the Auth0 SDK. If one has already been created, it returns that instance */
const useAuth = async (authOptions) => {
    if (instance) return instance;

    if(authImplementation == "auth0"){
        instance = new Auth0AuthService();
    }
    else{
        throw `Auth type ${authImplementation} is not implemented!`;
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