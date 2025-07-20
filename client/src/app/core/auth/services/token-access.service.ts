import { Injectable } from '@angular/core';
import { AccessToken } from '../models/access-token.model.js';
import { TOKEN_KEY } from '../auth.const.js';

@Injectable({
    providedIn: 'root'
})
export class TokenAccessService {
    getAccessToken(): AccessToken | null {
        return sessionStorage.getItem(TOKEN_KEY);
    }
}
