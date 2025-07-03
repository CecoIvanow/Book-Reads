import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { LoginCredentials } from '../../models/login-credentials.model.js';
import { AuthService } from '../../auth.service.js';
import { AuthResponse } from '../../models/auth-response.model.js';

@Component({
    selector: 'app-login',
    imports: [MatInputModule, MatFormFieldModule, MatButtonModule],
    templateUrl: './login.html',
    styleUrl: './login.scss',
})
export class Login {
    authResponse: AuthResponse | null = null; 

    constructor(private authService: AuthService) {
    }

    onLogin(e: Event) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        const credentials: LoginCredentials = {
            email,
            password,
        }

        this.authService.login(credentials).subscribe(data => this.authResponse = data);
        
    }
}