import { Routes } from '@angular/router';

import { Login } from './core/auth/pages/login/login.js';
import { Register } from './core/auth/pages/register/register.js';

export const routes: Routes = [
    {
        path: 'login', component: Login,
    },
    {
        path: 'register', component: Register,
    }
];
