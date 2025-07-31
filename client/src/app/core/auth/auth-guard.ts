import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenAccessService } from './services/token-access.service.js';

export const authGuard: CanActivateFn = async (route, state) => {
    const tokenService = inject(TokenAccessService);
    const router = inject(Router);

    await tokenService.onInit();

    const isUser = tokenService.accessToken();

    if (!isUser) {
        return router.createUrlTree(['/login']);
    }
    
    return true;
};

export const guestGuard: CanActivateFn = async (route, state) => {
    const tokenService = inject(TokenAccessService);
    const router = inject(Router);

    await tokenService.onInit();

    const isGuest = !tokenService.accessToken();

    if (!isGuest) {
        return router.createUrlTree(['/catalog']);
    }
    
    return true;
};