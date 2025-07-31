import { Injectable, signal } from '@angular/core';
import { AccessToken, TokenSignal } from '../models/index.js';
import { TOKEN_KEY } from '../auth.const.js';

@Injectable({
    providedIn: 'root'
})
export class TokenAccessService {
    accessToken = signal<TokenSignal>(null);
    private initPromise!: Promise<void>;

    constructor() {
        if (this.accessToken() === null) {
            this.initPromise = new Promise<void>(resolve => {
                this.accessToken.set(this.getAccessToken());
                resolve();
            })
        }
    }

    async onInit() {
        return this.initPromise;
    }

    private getAccessToken(): TokenSignal {
        if (typeof sessionStorage !== 'undefined') {
            return sessionStorage.getItem(TOKEN_KEY);
        }

        return 'none';
    }

    saveSessionToken(token: AccessToken) {
        sessionStorage.setItem(TOKEN_KEY, token);
        this.accessToken.set(token);
    }

    removeSessionToken() {
        sessionStorage.removeItem(TOKEN_KEY);
        this.accessToken.set('none');
    }

}
