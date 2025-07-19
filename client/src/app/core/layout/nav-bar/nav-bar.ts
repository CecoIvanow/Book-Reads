import { Component } from '@angular/core';
import { removeSessionToken } from '../../auth/auth-storage.util.js';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss'
})
export class NavBar {

    onLogout(){
        removeSessionToken();
    }
}
