import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { RegisterCredentials } from '../../models/index.js';
import { AuthService } from '../../services/auth.service.js';
import { Router, RouterModule } from '@angular/router';
import { UserSessionService } from '../../services/user-session.service.js';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';

@Component({
    selector: 'app-register',
    imports: [
        MatInputModule,
        MatFormFieldModule,
        MatRadioModule,
        MatButtonModule,
        RouterModule,
        ReactiveFormsModule
    ],
    templateUrl: './register.html',
    styleUrl: './register.scss'
})

export class Register {
    private emailPattern = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

    protected registerForm: FormGroup;

    constructor(
        private router: Router,
        private authService: AuthService,
        private formBuilder: FormBuilder,
        protected useSession: UserSessionService
    ) {
        this.registerForm = formBuilder.group({
            email: ['',
                [Validators.required, Validators.pattern(this.emailPattern)]
            ],
            password: ['',
                [Validators.required, Validators.minLength(4)]
            ],
            rePass: ['',
                [Validators.required, Validators.minLength(4)]
            ],
            firstName: ['',
                [Validators.required]
            ],
            lastName: ['',
                [Validators.required]
            ]
        }, {
            validators: this.passwordMatchValidator()
        })
    }


    passwordMatchValidator(): ValidatorFn {
        return (formGroup: AbstractControl) => {
            const passwordControl = formGroup.get('password');
            const rePassControl = formGroup.get('rePass');

            if (!passwordControl || !rePassControl) {
                return null;
            }

            const password = passwordControl.value;
            const rePass = rePassControl.value;

            if (password !== rePass) {
                
                rePassControl.setErrors({ passwordMismatch: true });
                return { passwordMismatch: true };
            } else {
                if (rePassControl.errors?.['passwordMismatch']) {
                    delete rePassControl.errors['passwordMismatch'];

                    if (Object.keys(rePassControl.errors).length === 0) {
                        rePassControl.setErrors(null);
                    }
                }
                return null;
            }
        };
    }


    async onRegister() {
        if (this.registerForm.invalid) {
            return;
        }

        const credentials: RegisterCredentials = {
            email: this.registerForm.value.email,
            password: this.registerForm.value.password,
            firstName: this.registerForm.value.firstName,
            lastName: this.registerForm.value.lastName,
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
