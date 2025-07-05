import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { AuthResponse, LoginCredentials } from '../../models/index.js';
import { AuthService } from '../../auth.service.js';

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