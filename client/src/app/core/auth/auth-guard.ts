import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserSessionService } from './services/index.js';
import { BooksService } from '../../features/books/services/index.js';
import { firstValueFrom } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
    const userSession = inject(UserSessionService);
    const router = inject(Router);

    const userToken = userSession.userToken();

    if (!userToken) {
        return router.createUrlTree(['/login']);
    }

    return true;
};

export const guestGuard: CanActivateFn = (route, state) => {
    const userSession = inject(UserSessionService);
    const router = inject(Router);

    const userToken = userSession.userToken();

    if (userToken) {
        return router.createUrlTree(['/catalog']);
    }

    return true;
};

export const ownerGuard: CanActivateFn = async (route, state) => {
    const userSession = inject(UserSessionService);
    const booksService = inject(BooksService)
    const router = inject(Router);

    const bookId = route.params['bookId'];
    const userId = userSession.userId();

    try {
        const book = await firstValueFrom(booksService.getBook(bookId))
        const ownerId = book._ownerId;

        if (ownerId !== userId) {
            return router.createUrlTree(['/catalog']);
        }

        return true;
    } catch (error) {
        console.error('Error fetching book:', error);
        return router.createUrlTree(['/catalog']);
    }
};