import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UserSessionService } from '../../auth/services/user-session.service.js';
import { AuthService } from '../../auth/services/index.js';

@Component({
    selector: 'app-nav-bar',
    imports: [RouterModule],
    templateUrl: './nav-bar.html',
    styleUrl: './nav-bar.scss'
})
export class NavBar {

    constructor(
        protected userSession: UserSessionService,
        private authService: AuthService,
        private router: Router
    ) {
    }

    onLogout() {
        const token = this.userSession.userToken();

        if (!token) {
            return
        }

        this.userSession.removeSessionToken();
        this.authService.logout(token).subscribe({
            next: () => {
                this.router.navigate(['/']);
            }
        });
    }
}
