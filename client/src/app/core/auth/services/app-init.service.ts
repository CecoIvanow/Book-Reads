import { Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserSessionService } from './user-session.service.js';

@Injectable({ providedIn: 'root' })
export class AppInitService {
    constructor(
        private userSession: UserSessionService,
    ) { }

    init(): Promise<boolean> {
        return new Promise(resolve => {
            if (isPlatformBrowser(PLATFORM_ID)) {
                const initialPath = window.location.pathname;

                if (['/login', '/register'].includes(initialPath)) {
                    if (this.userSession.userToken()) {
                        window.location.href = '/catalog';
                        return resolve(false);
                    }
                }
            }

            resolve(true);
        });
    }
}