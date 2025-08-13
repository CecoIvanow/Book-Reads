import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginCredentials, RegisterCredentials, AuthResponse, AccessToken } from '../models/index.js';
import { Observable } from 'rxjs';
import { API_PATHS } from '../../../shared/constants/index.js';
import { buildURL } from '../../../shared/utils/index.js';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    constructor(private httpClient: HttpClient) {
    }

    login(body: LoginCredentials): Observable<AuthResponse> {
        const url = buildURL(API_PATHS.AUTH.LOGIN);

        return this.httpClient.post<AuthResponse>(url, body)
    }

    register(body: RegisterCredentials): Observable<AuthResponse> {
        const url = buildURL(API_PATHS.AUTH.REGISTER);

        return this.httpClient.post<AuthResponse>(url, body);
    }

    logout(): Observable<undefined> {
        const url = buildURL(API_PATHS.AUTH.LOGOUT);

        return this.httpClient.get<undefined>(url);
    }
}
