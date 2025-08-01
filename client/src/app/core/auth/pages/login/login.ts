import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { AuthResponse, LoginCredentials } from '../../models/index.js';
import { AuthService } from '../../services/auth.service.js';
import { Router, RouterModule } from '@angular/router';
import { UserSessionService } from '../../services/user-session.service.js';

@Component({
    selector: 'app-login',
    imports: [MatInputModule, MatFormFieldModule, MatButtonModule, RouterModule],
    templateUrl: './login.html',
    styleUrl: './login.scss',
})
export class Login {

    constructor(
        private router: Router,
        private authService: AuthService,
        protected userSession: UserSessionService) {
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

        this.authService.login(credentials).subscribe({
            next: (data) => {
                this.userSession.saveSessionToken({
                    token: data.accessToken,
                    id: data._id
                });

                this.router.navigate(['/']);
            }
        });
    }
}