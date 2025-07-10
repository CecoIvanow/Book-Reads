import { Injectable } from '@angular/core';
import { AccessToken } from '../models/access-token.model.js';

@Injectable({
    providedIn: 'root'
})
export class TokenAccessService {
    TOKEN_KEY = 'accessToken';

    getAccessToken(): AccessToken | null {
        return sessionStorage.getItem(this.TOKEN_KEY);
    }
}
