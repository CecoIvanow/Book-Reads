import { Routes } from '@angular/router';
import { authGuard, guestGuard, ownerGuard } from './core/auth/auth-guard.js';
import { bookDetailsResolver } from './features/books/books.resolver.js';
import { usersDetailsResolver } from './features/users/users.resolver.js';

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
        path: 'books/add',
        loadComponent: () => import('./features/books/pages/add/add.js').then(c => c.Add),
        pathMatch: 'full',
        canActivate: [authGuard],
    },
    {
        path: 'books/details/:bookId',
        loadComponent: () => import('./features/books/pages/details/book-details.js').then(c => c.BookDetails),
        pathMatch: 'full',
        resolve: {
            bookDetails: bookDetailsResolver
        }
    },
    {
        path: 'books/edit/:bookId',
        loadComponent: () => import('./features/books/pages/edit/edit.js').then(c => c.Edit),
        pathMatch: 'full',
        canActivate: [ownerGuard],
        resolve: {
            bookDetails: bookDetailsResolver
        }
    },
    {
        path: 'users/details/:userId',
        loadComponent: () => import('./features/users/pages/user-details/user-details.js').then(c => c.UserDetails),
        pathMatch: 'full',
        runGuardsAndResolvers: 'paramsChange',
        resolve: {
            userDetails: usersDetailsResolver
        }
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
