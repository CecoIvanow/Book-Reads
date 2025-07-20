import { Routes } from '@angular/router';

import { Login } from './core/auth/pages/login/login.js';
import { Register } from './core/auth/pages/register/register.js';
import { Catalog } from './features/books/pages/catalog/catalog.js';
import { Details } from './features/books/pages/details/details.js';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'register', component: Register },
    { path: 'catalog', component: Catalog },
    { path: 'books/details/:bookId', component: Details },
];
