import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginCredentials, RegisterCredentials, AuthResponse } from './models/index.js';
import { Observable } from 'rxjs';
import { API_PATHS } from '../../shared/constants/index.js';
import { buildURL } from '../../shared/utils/api-url-builder.util.js';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    constructor(private httpClient: HttpClient) {
    }

    login(body: LoginCredentials): Observable<AuthResponse> {
        const url = buildURL(API_PATHS.USERS.LOGIN);

        return this.httpClient.post<AuthResponse>(url, body)
    }

    register(body: RegisterCredentials): Observable<AuthResponse> {
        const url = buildURL(API_PATHS.USERS.REGISTER);

        return this.httpClient.post<AuthResponse>(url, body);
    }
}
