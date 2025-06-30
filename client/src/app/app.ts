import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginPage } from './login-page/login-page.js';
import { RegisterPage } from './register-page/register-page.js';
import { NavBar } from './nav-bar/nav-bar.js';
import { CatalogPage } from './catalog-page/catalog-page.js';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoginPage, RegisterPage, NavBar, CatalogPage],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Book-Reads';
}
