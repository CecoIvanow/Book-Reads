import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Book } from '../../models/index.js';
import { forkJoin, Subscription } from 'rxjs';
import { BooksService } from '../../books.service.js';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-catalog-page',
    imports: [
        MatCardModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatPaginatorModule,
        RouterModule,
    ],
    templateUrl: './catalog.html',
    styleUrl: './catalog.scss'
})
export class Catalog implements OnInit, OnDestroy {
    protected booksCount: number = 0;
    protected books: Book[] | null = null;
    protected isLoading: boolean = false;
    protected skipBooks: number = 0;
    protected pageSize: number = 10;

    private subscriptions: Subscription | null = null;

    constructor(private booksService: BooksService, private cdr: ChangeDetectorRef) {
    }

    ngOnInit() {
        this.isLoading = true;

        this.fetchBooks();
    }

    ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }
    
    fetchBooks() {
        this.subscriptions?.unsubscribe();
        const observables$ = forkJoin([
            this.booksService.getPaginatedBooks(this.skipBooks, this.pageSize),
            this.booksService.getBooksCount(),
        ])

        const sub = observables$.subscribe({
            next: (data) => {
                this.books = data[0];
                this.booksCount = data[1];
                this.cdr.detectChanges();
            },
            complete: () => {
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            
        }
    );

        this.subscriptions?.add(sub);
    }

    onPageChange(e: PageEvent): void {
        this.pageSize = e.pageSize;
        this.skipBooks = e.pageIndex * this.pageSize;
        this.fetchBooks();
    }
}
