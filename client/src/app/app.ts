import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './core/layout/nav-bar/nav-bar.js';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, NavBar],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    protected title = 'Book-Reads';
}
