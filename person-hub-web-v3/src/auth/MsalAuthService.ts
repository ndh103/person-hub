import { PublicClientApplication, AuthenticationResult, Configuration, LogLevel, AccountInfo, RedirectRequest, PopupRequest, EndSessionRequest } from "@azure/msal-browser";
import AuthServiceInterface from "./AuthServiceInterface";
import UserInfo from "./UserInfo";

const b2cConfig = {
    policyAuthorities:{
        signUpSignIn: import.meta.env.VITE_AZUREADB2C_SIGN_IN_POLICY_AUTHORITY
    },
    authorityDomain: import.meta.env.VITE_AZUREADB2C_AUTHORITY_DOMAIN,
    clientId : import.meta.env.VITE_AZUREADB2C_CLIENTID,
    apiApplicationIdUrl: import.meta.env.VITE_AZUREADB2C_API_APP_ID_URL
}

const apiScopes = [`${b2cConfig.apiApplicationIdUrl}/Api.Read`, `${b2cConfig.apiApplicationIdUrl}/Api.Write`];

/**
 * Configuration class for @azure/msal-browser: 
 * https://azuread.github.io/microsoft-authentication-library-for-js/ref/msal-browser/modules/_src_config_configuration_.html
 */
const MSAL_CONFIG: Configuration = {
    auth: {
        clientId: b2cConfig.clientId,
        authority: b2cConfig.policyAuthorities.signUpSignIn,
        knownAuthorities: [b2cConfig.authorityDomain],
    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                }
            }
        }
    }
};

export default class MsalAuthService implements AuthServiceInterface {
    loading = true;
    isAuthenticated = false;
    user = new UserInfo();
    popupOpen = false;
    error: null;

    private myMSALObj: PublicClientApplication;
    private account: AccountInfo | null;
    private loginRedirectRequest: RedirectRequest;
    
    // private scopes = [];

    constructor() {
        this.myMSALObj = new PublicClientApplication(MSAL_CONFIG);
        this.account = null;

        this.loginRedirectRequest = {
            scopes: apiScopes,
            redirectStartPage: window.location.origin
        };
    }

    /** Authenticates the user using the redirect method */
    loginWithRedirect(options): Promise<void> {
        return this.myMSALObj.loginRedirect(this.loginRedirectRequest);
    }

    /** Logs the user out and removes their session on the authorization server */
    logout(options) {
        let account: AccountInfo | undefined;
        if (this.account) {
            account = this.account
        }
        const logOutRequest: EndSessionRequest = {
            account
        };

        return this.myMSALObj.logoutRedirect(logOutRequest);
    }

    async getTokenSilently(options) {
        try {
            const response = await this.myMSALObj.acquireTokenSilent({
                account: this.account,
                scopes: apiScopes
            });

            return response.accessToken;
        } catch (e) {
            console.log("silent token acquisition fails.");
            console.error(e);
        }

        return null;
    }

    async getUser() {
        if(!this.account){
            return null;
        }

        //TODO: Get detailed user info, maybe from the id_claims?
        this.user = new UserInfo();
        this.user.name = this.account.name;
        this.user.email = this.account.username
    }

    async isUserAuthenticated() {
        return this.isAuthenticated;
    }

    async init(options) {
        this.loading = true;

        const response = await this.myMSALObj.handleRedirectPromise();

        this.handleResponse(response);

        this.loading = false;
    }

    /**
     * Calls getAllAccounts and determines the correct account to sign into, currently defaults to first account found in cache.
     * TODO: Add account chooser code
     * 
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
     */
    private getAccount(): AccountInfo | null {
        
        // need to call getAccount here?
        const currentAccounts = this.myMSALObj.getAllAccounts();

        if (currentAccounts === null) {
            console.log("No accounts detected");
            return null;
        }

        if (currentAccounts.length > 1) {
            // Add choose account code here
            console.log("Multiple accounts detected, need to add choose account code.");

            return currentAccounts[0];
        } else if (currentAccounts.length === 1) {
            return currentAccounts[0];
        }

        return null;
    }

    /**
     * Handles the response from a popup or redirect. If response is null, will check if we have any accounts and attempt to sign in.
     * @param response 
     */
    private handleResponse(response: AuthenticationResult | null) {
        if (response !== null) {
            this.account = response.account;
        } else {
            this.account = this.getAccount();
        }

        if (this.account) {
            this.isAuthenticated = true;
        }
    }
}