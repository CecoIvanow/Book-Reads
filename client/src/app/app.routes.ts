import { Routes } from '@angular/router';

import { Details } from './features/books/pages/details/details.js';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./core/auth/pages/login/login.js').then(c => c.Login),
        pathMatch: 'full',
    },
    {
        path: 'register',
        loadComponent: () => import('./core/auth/pages/register/register.js').then(c => c.Register),
        pathMatch: 'full',
    },  
    {
        path: 'catalog',
        loadComponent: () => import('./features/books/pages/catalog/catalog.js').then(c => c.Catalog),
        pathMatch: 'full',
    },
    {
        path: 'books/details/:bookId',
        loadComponent: () => import('./features/books/pages/details/details.js').then(c => c.Details),
        pathMatch: 'full',
    },
];
