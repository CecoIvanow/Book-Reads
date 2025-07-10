import { TOKEN_KEY } from "./auth.const.js";
import { AccessToken } from "./models/access-token.model.js";

export function saveSessionToken(token: AccessToken) {    
    sessionStorage.setItem(TOKEN_KEY, token);
}

export function removeSessionToken() {
    sessionStorage.removeItem(TOKEN_KEY);
}