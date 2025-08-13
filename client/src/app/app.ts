import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './core/layout/nav-bar/nav-bar.js';
import { isPlatformBrowser } from '@angular/common';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, NavBar],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App implements OnInit {
    protected title = 'Book-Reads';

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            document.body.classList.add('angular-ready');
        }
    }
}
