import { AccessToken } from "./models/access-token.model.js";

const TOKEN_KEY = 'accessToken';

export function saveSessionToken(token: AccessToken) {    
    sessionStorage.setItem(TOKEN_KEY, token);
}

export function removeSessionToken() {
    sessionStorage.removeItem(TOKEN_KEY);
}