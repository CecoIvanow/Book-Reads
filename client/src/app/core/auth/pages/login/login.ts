import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { LoginCredentials } from '../../models/index.js';
import { AuthService } from '../../services/auth.service.js';
import { saveSessionToken } from '../../auth-storage.util.js';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-login',
    imports: [MatInputModule, MatFormFieldModule, MatButtonModule, RouterModule],
    templateUrl: './login.html',
    styleUrl: './login.scss',
})
export class Login {

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

        this.authService.login(credentials).subscribe(data => saveSessionToken(data.accessToken));
    }
}