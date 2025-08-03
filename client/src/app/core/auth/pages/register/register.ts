import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { RegisterCredentials } from '../../models/index.js';
import { AuthService } from '../../services/auth.service.js';
import { Router, RouterModule } from '@angular/router';
import { UserSessionService } from '../../services/user-session.service.js';

@Component({
    selector: 'app-register',
    imports: [MatInputModule, MatFormFieldModule, MatRadioModule, MatButtonModule, RouterModule],
    templateUrl: './register.html',
    styleUrl: './register.scss'
})

export class Register {

    constructor(
        private router: Router,
        private authService: AuthService,
        protected useSession: UserSessionService
    ) {
    }

    async onRegister(e: Event) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const firstName = formData.get('firstName') as string;
        const lastName = formData.get('lastName') as string;

        const credentials: RegisterCredentials = {
            email,
            password,
            firstName,
            lastName
        }

        this.authService.register(credentials).subscribe({
            next: (data) => {
                this.useSession.saveSessionToken({
                    token: data.accessToken,
                    id: data._id,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    username: data.username,
                })

                this.router.navigate(['/']);
            }
        });
    }
}
