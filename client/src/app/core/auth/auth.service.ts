import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginCredentials, RegisterCredentials, AuthResponse } from './models/index.js';
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

    register(body: RegisterCredentials): Observable<AuthResponse> {
        return this.httpClient.post<AuthResponse>(this.apiUrl + '/register', body);
    }
}
