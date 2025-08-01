import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth-guard.js';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./core/home/pages/home/home.js').then(c => c.Home),
        pathMatch: 'full',
    },
    {
        path: 'login',
        loadComponent: () => import('./core/auth/pages/login/login.js').then(c => c.Login),
        pathMatch: 'full',
        canActivate: [guestGuard],
    },
    {
        path: 'register',
        loadComponent: () => import('./core/auth/pages/register/register.js').then(c => c.Register),
        pathMatch: 'full',
        canActivate: [guestGuard],
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
    {
        path: 'books/add',
        loadComponent: () => import('./features/books/pages/add/add.js').then(c => c.Add),
        pathMatch: 'full',
        canActivate: [authGuard],
    },
    {
        path: '404',
        loadComponent: () => import('./core/not-found/page/not-found/not-found.js').then(c => c.NotFound),
    },
    {
        path: '**',
        redirectTo: '404',
    }
];
