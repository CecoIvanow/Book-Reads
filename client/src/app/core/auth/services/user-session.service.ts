import { computed, Injectable, Signal, signal } from '@angular/core';
import { AccessToken, TokenSignal, UserSessionData } from '../models/index.js';
import { USER_SESSION_KEY } from '../auth.const.js';
import { UUIDv4 } from '../../../shared/models/index.js';

@Injectable({
    providedIn: 'root'
})
export class UserSessionService {
    private _sessionData = signal<TokenSignal>(null);

    constructor() {
        if (this._sessionData() === null) {
            this._sessionData.set(this.getAccessToken());
        }
    }

    userId: Signal<UUIDv4 | null> = computed(() => {
        const curSession = this._sessionData();

        return (curSession && curSession !== 'none') ? curSession.id : null;
    })

    userToken: Signal<AccessToken | null> = computed(() => {
        const curSession = this._sessionData();

        return (curSession && curSession !== 'none') ? curSession.token : null;
    })

    firstName: Signal<string | null> = computed(() => {
        const curSession = this._sessionData();

        return (curSession && curSession !== 'none') ? curSession.firstName : null;
    })

    lastName: Signal<string | null> = computed(() => {
        const curSession = this._sessionData();

        return (curSession && curSession !== 'none') ? curSession.lastName : null;
    })

    email: Signal<string | null> = computed(() => {
        const curSession = this._sessionData();

        return (curSession && curSession !== 'none') ? curSession.email : null;
    })

    username: Signal<string | null> = computed(() => {
        const curSession = this._sessionData();

        return (curSession && curSession !== 'none') ? curSession.username : null;
    })

    private getAccessToken(): TokenSignal {
        if (typeof sessionStorage !== 'undefined') {
            const data = sessionStorage.getItem(USER_SESSION_KEY);
            
            return data ? JSON.parse(data) : null;
        }

        return 'none';
    }

    saveSessionToken(sessionData: UserSessionData) {
        sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionData));
        this._sessionData.set(sessionData);
    }
    
    removeSessionToken() {
        sessionStorage.removeItem(USER_SESSION_KEY);
        this._sessionData.set('none');
    }
}
