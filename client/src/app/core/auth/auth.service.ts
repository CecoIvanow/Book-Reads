import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RegisterCredentials } from './models/register-credentials.model.js';
import { LoginCredentials } from './models/login-credentials.model.js';
import { AuthResponse } from './models/auth-response.model.js';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:3030/users';

    constructor(private httpClient: HttpClient) {
    }

    login(body: LoginCredentials): Observable<AuthResponse> {
        return this.httpClient.post<AuthResponse>(this.apiUrl + '/login', body)
    }
}
