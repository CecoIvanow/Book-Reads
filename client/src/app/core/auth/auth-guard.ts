import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserSessionService } from './services/user-session.service.js';

export const authGuard: CanActivateFn = async (route, state) => {
    const userSession = inject(UserSessionService);
    const router = inject(Router);

    const isUser = userSession.userToken();

    if (!isUser) {
        return router.createUrlTree(['/login']);
    }

    return true;
};

export const guestGuard: CanActivateFn = async (route, state) => {
    const userSession = inject(UserSessionService);
    const router = inject(Router);

    const isGuest = !userSession.userToken();

    if (!isGuest) {
        return router.createUrlTree(['/catalog']);
    }

    return true;
};