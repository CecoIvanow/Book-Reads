import { Injectable, signal } from '@angular/core';
import { TokenSignal, UserSessionData } from '../models/index.js';
import { USER_SESSION_KEY } from '../auth.const.js';

@Injectable({
    providedIn: 'root'
})
export class UserSessionService {
    sessionData = signal<TokenSignal>(null);
    private initPromise!: Promise<void>;

    constructor() {
        if (this.sessionData() === null) {
            this.initPromise = new Promise<void>(resolve => {
                this.sessionData.set(this.getAccessToken());
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
        this.sessionData.set(sessionData);
    }
    
    removeSessionToken() {
        sessionStorage.removeItem(USER_SESSION_KEY);
        this.sessionData.set('none');
    }
}
