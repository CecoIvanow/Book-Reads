import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserSessionService } from '../../auth/services/user-session.service.js';

@Component({
    selector: 'app-nav-bar',
    imports: [RouterModule],
    templateUrl: './nav-bar.html',
    styleUrl: './nav-bar.scss'
})
export class NavBar {

    constructor(protected userSession: UserSessionService) {
    }

    onLogout() {
        this.userSession.removeSessionToken();
    }
}
