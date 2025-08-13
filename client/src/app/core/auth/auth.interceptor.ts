import { HttpInterceptorFn } from '@angular/common/http';
import { UserSessionService } from './services/index.js';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const userSession = inject(UserSessionService);
    const sessionToken = userSession.userToken();

    if (!sessionToken) {
        return next(req);
    }

    const updatedReq = req.clone({
        setHeaders: {
            'X-Authorization': sessionToken,
        }
    })

    return next(updatedReq);
};
