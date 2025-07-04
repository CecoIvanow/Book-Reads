import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Book } from '../../book.model.js';
import { BooksService } from '../../books.service.js';

@Component({
    selector: 'app-catalog-page',
    imports: [MatCardModule, MatButtonModule],
    templateUrl: './catalog.html',
    styleUrl: './catalog.scss'
})
export class Catalog {
    books$: Book[] | null = null;

    constructor(private booksServices: BooksService) {
    }

    ngOnInit() {
        this.booksServices.getAllBooks().subscribe(data => this.books$ = data);
    }
}
