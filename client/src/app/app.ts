import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './core/layout/nav-bar/nav-bar.js';
import { Catalog } from './features/books/pages/catalog/catalog.js';
import { Login } from './core/auth/pages/login/login.js';
import { Register } from './core/auth/pages/register/register.js';
import { Details } from './features/books/pages/details/details.js';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, Login, Register, NavBar, Catalog, Details],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    protected title = 'Book-Reads';
}
