import { Component } from '@angular/core';
import { removeSessionToken } from '../../auth/auth-storage.util.js';

@Component({
  selector: 'app-nav-bar',
  imports: [],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss'
})
export class NavBar {

    onLogout(){
        removeSessionToken();
    }
}
