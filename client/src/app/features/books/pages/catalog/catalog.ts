import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Book } from '../../book.model.js';

@Component({
    selector: 'app-catalog-page',
    imports: [],
    templateUrl: './catalog.html',
    styleUrl: './catalog.scss'
})
export class Catalog {
    books$: Book[] | null = null;

    constructor(private httpClient: HttpClient) {
    }

    async ngOnInit() {
    }
}
