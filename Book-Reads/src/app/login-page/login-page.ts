import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

interface Gender {
    gender: 'Male' | 'Female';
}

@Component({
    selector: 'login-page',
    imports: [MatInputModule, MatFormFieldModule, MatSelectModule, MatButtonModule],
    templateUrl: './login-page.html',
    styleUrl: './login-page.scss',
})
export class LoginPage {
    genders: Gender[] = [
        { gender: 'Male' },
        { gender: 'Female' }
    ];
}
