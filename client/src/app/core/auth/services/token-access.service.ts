import { Injectable, OnInit, signal } from '@angular/core';
import { AccessToken } from '../models/access-token.model.js';
import { TOKEN_KEY } from '../auth.const.js';
import { Subscription } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TokenAccessService {
    accessToken = signal<AccessToken | null | 'none'>(null);
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

    private getAccessToken(): AccessToken | null | 'none' {
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
