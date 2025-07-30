import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TokenAccessService } from '../../auth/services/token-access.service.js';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss'
})
export class NavBar {

    constructor(protected tokenService: TokenAccessService){
    }

    onLogout(){
        this.tokenService.removeSessionToken();
    }
}
