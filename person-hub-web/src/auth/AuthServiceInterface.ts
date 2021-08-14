/* eslint-disable @typescript-eslint/no-explicit-any */

interface AuthServiceInterface {
    loading: boolean;
    isAuthenticated: boolean;
    user: object;
    popupOpen: boolean;
    error: object;

    loginWithPopup(options, config): Promise<void>;
    
    handleRedirectCallback(): Promise<void>;

    /** Authenticates the user using the redirect method */
    loginWithRedirect(options?): any;

    /** Returns all the claims present in the ID token */
    getIdTokenClaims(options?): any;

    /** Returns the access token. If the token is invalid or missing, a new one is retrieved */
    getTokenSilently(options?): any;

    /** Gets the access token using a popup window */
    getTokenWithPopup(options?): any;

    /** Logs the user out and removes their session on the authorization server */
    logout(options?): any;

    getUser(): Promise<any>;

    isUserAuthenticated(): Promise<boolean>;

    init(options): Promise<void>;
}

export default AuthServiceInterface;