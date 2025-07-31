import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserSessionService } from './services/user-session.service.js';

export const authGuard: CanActivateFn = async (route, state) => {
    const tokenService = inject(UserSessionService);
    const router = inject(Router);

    await tokenService.onInit();

    const isUser = tokenService.sessionData();

    if (!isUser) {
        return router.createUrlTree(['/login']);
    }

    return true;
};

export const guestGuard: CanActivateFn = async (route, state) => {
    const tokenService = inject(UserSessionService);
    const router = inject(Router);

    await tokenService.onInit();

    const isGuest = !tokenService.sessionData();

    if (!isGuest) {
        return router.createUrlTree(['/catalog']);
    }

    return true;
};