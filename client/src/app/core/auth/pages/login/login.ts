import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { LoginCredentials } from '../../models/index.js';
import { AuthService } from '../../services/auth.service.js';
import { Router, RouterModule } from '@angular/router';
import { UserSessionService } from '../../services/user-session.service.js';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { SnackbarService } from '../../../../shared/snackbar.service.js';

@Component({
    selector: 'app-login',
    imports: [
        MatInputModule,
        MatFormFieldModule,
        MatButtonModule,
        RouterModule,
        ReactiveFormsModule,
    ],
    templateUrl: './login.html',
    styleUrl: './login.scss',
})
export class Login {
    protected loginForm: FormGroup;

    constructor(
        private router: Router,
        private authService: AuthService,
        private formBuilder: FormBuilder,
        private _snackBar: SnackbarService,
        protected userSession: UserSessionService,
    ) {
        this.loginForm = formBuilder.group({
            'email': ['',
                [Validators.required, Validators.email]
            ],
            'password': ['',
                [Validators.required]
            ],
        })
    }

    onLogin() {
        if (this.loginForm.invalid) {
            return;
        }

        const credentials: LoginCredentials = {
            email: this.loginForm.value.email,
            password: this.loginForm.value.password,
        }

        this.authService.login(credentials).subscribe({
            next: (data) => {
                this.userSession.saveSessionToken({
                    token: data.accessToken,
                    id: data._id,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    username: data.username,
                });

                this.router.navigate(['/']);
            },
            error: (error: HttpErrorResponse) => {
                if (error.status === 403) {
                    this._snackBar.showSnackBar('Unable to login, invalid credentials!');
                }
            }
        });
    }
}