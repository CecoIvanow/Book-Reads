import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { RegisterCredentials } from '../../models/register-credentials.model.js';
import { AuthService } from '../../auth.service.js';
import { AuthResponse } from '../../models/auth-response.model.js';

type Gender = 'Male' | 'Female';

@Component({
    selector: 'app-register',
    imports: [MatInputModule, MatFormFieldModule, MatRadioModule, MatButtonModule],
    templateUrl: './register.html',
    styleUrl: './register.scss'
})

export class Register {
    authResponse: AuthResponse | null = null;

    constructor(private authService: AuthService){
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

        this.authService.register(credentials).subscribe(data => this.authResponse = data);
    }
}
