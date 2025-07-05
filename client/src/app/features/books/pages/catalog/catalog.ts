import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatPaginator } from '@angular/material/paginator';
import { Book } from '../../book.model.js';
import { BooksService } from '../../books.service.js';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-catalog-page',
    imports: [
        MatCardModule,
        MatButtonModule,
        MatProgressSpinner,
        MatPaginator
    ],
    templateUrl: './catalog.html',
    styleUrl: './catalog.scss'
})
export class Catalog implements OnInit {
    protected booksCount: number = 0;
    protected books: Book[] | null = null;
    protected isLoading: boolean = false;

    constructor(private booksService: BooksService) {
    }

    ngOnInit() {
        this.isLoading = true;

        const observables$ = forkJoin([
            this.booksService.getPaginatedBooks(),
            this.booksService.getBooksCount(),
        ])

        observables$.subscribe({
            next: (data) => {
                this.books = data[0];
                this.booksCount = data[1];
            },
            complete: () => {
                this.isLoading = false;
            },
        });

    }
}
