import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Book } from '../../book.model.js';
import { BooksService } from '../../books.service.js';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-catalog-page',
    imports: [MatCardModule, MatButtonModule, MatProgressSpinner],
    templateUrl: './catalog.html',
    styleUrl: './catalog.scss'
})
export class Catalog {
    protected booksCount$: number = 0;
    protected books$: Book[] | null = null;
    protected isLoading: boolean = false;

    constructor(private booksServices: BooksService) {
    }

    ngOnInit() {
        this.isLoading = true;

        const observable = forkJoin([
            this.booksServices.getPaginatedBooks(),
            this.booksServices.getBooksCount(),
        ])

        observable.subscribe({
            next: (data) => {
                this.books$ = data[0];
                this.booksCount$ = data[1];
            },
            complete: () => {
                this.isLoading = false;
                console.log(this.booksCount$)
            },
        });

    }
}
