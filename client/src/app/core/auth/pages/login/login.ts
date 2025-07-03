import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { LoginCredentials } from '../../models/login-credentials.model.js';

@Component({
    selector: 'app-login',
    imports: [MatInputModule, MatFormFieldModule, MatButtonModule],
    templateUrl: './login.html',
    styleUrl: './login.scss',
})
export class Login {
    async onLogin(e: Event) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const email = formData.get('email') as string;        
        const password = formData.get('password') as string;        

        const credentials: LoginCredentials = {
            email,
            password,
        }

        const resp = await fetch('http://localhost:3030/users/login', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify(credentials)
        })
        const data = await resp.json();
    }
}