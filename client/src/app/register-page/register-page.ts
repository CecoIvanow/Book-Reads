import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';

type Gender = 'Male' | 'Female';

@Component({
    selector: 'register-page',
    imports: [MatInputModule, MatFormFieldModule, MatRadioModule, MatButtonModule],
    templateUrl: './register-page.html',
    styleUrl: './register-page.scss'
})

export class RegisterPage {
    genders: Gender[] = [
        'Male',
        'Female'
    ]

    async onRegister(e: Event) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const registerData = Object.fromEntries(formData);

        const resp = await fetch('http://localhost:3030/users/register', {
            method: 'POST',
            body: JSON.stringify({
                ...registerData
            })
        })
        const data = await resp.json();
    }
}
