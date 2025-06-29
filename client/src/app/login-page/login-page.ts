import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'login-page',
    imports: [MatInputModule, MatFormFieldModule, MatButtonModule],
    templateUrl: './login-page.html',
    styleUrl: './login-page.scss',
})
export class LoginPage {
    async onLogin(e: Event) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const {password, email} = Object.fromEntries(formData);        

        const resp = await fetch('http://localhost:3030/users/login', {
            method: 'POST',
            body: JSON.stringify({
                password,
                email
            })
        })
        const data = await resp.json();
    }
}