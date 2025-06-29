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

}
