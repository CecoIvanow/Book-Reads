import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './core/layout/nav-bar/nav-bar.js';
import { CatalogPage } from './catalog-page/catalog-page.js';
import { Login } from './core/auth/pages/login/login.js';
import { Register } from './core/auth/pages/register/register.js';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Login, Register, NavBar, CatalogPage],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Book-Reads';
}
