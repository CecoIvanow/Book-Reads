import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Book } from '../../book.model.js';
import { BooksService } from '../../services/index.js';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-catalog-page',
    imports: [
        MatCardModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatPaginatorModule
    ],
    templateUrl: './catalog.html',
    styleUrl: './catalog.scss'
})
export class Catalog implements OnInit {
    protected booksCount: number = 0;
    protected books: Book[] | null = null;
    protected isLoading: boolean = false;
    protected skipBooks: number = 0;
    protected pageSize: number = 10;

    constructor(private booksService: BooksService) {
    }

    ngOnInit() {
        this.isLoading = true;

        this.fetchBooks();
    }  

    fetchBooks(){
        const observables$ = forkJoin([
            this.booksService.getPaginatedBooks(this.skipBooks, this.pageSize),
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
 
    onPageChange(e: PageEvent): void {
        this.pageSize = e.pageSize;
        this.skipBooks = e.pageIndex * this.pageSize;
        this.fetchBooks();
    }
}
