import { Injectable, signal } from '@angular/core';
import { AccessToken } from '../models/access-token.model.js';
import { TOKEN_KEY } from '../auth.const.js';

@Injectable({
    providedIn: 'root'
})
export class TokenAccessService {
    accessToken = signal<AccessToken | null>(null);

    getAccessToken(): AccessToken | null {
        return sessionStorage.getItem(TOKEN_KEY);
    }

    saveSessionToken(token: AccessToken) {
        sessionStorage.setItem(TOKEN_KEY, token);
        this.accessToken.set(token);
    }

    removeSessionToken() {
        sessionStorage.removeItem(TOKEN_KEY);
        this.accessToken.set(null);
    }
}
