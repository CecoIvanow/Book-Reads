import { Injectable, signal } from '@angular/core';
import { TokenSignal, UserSessionData } from '../models/index.js';
import { USER_SESSION_KEY } from '../auth.const.js';

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
            const data = sessionStorage.getItem(USER_SESSION_KEY);
            
            return data ? JSON.parse(data) : null;
        }

        return 'none';
    }

    saveSessionToken(sessionData: UserSessionData) {
        sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionData));
        this.accessToken.set(sessionData);
    }
    
    removeSessionToken() {
        sessionStorage.removeItem(USER_SESSION_KEY);
        this.accessToken.set('none');
    }
}
