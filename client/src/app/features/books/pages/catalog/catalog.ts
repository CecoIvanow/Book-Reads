import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Book } from '../../models/index.js';
import { forkJoin, Subscription } from 'rxjs';
import { BooksService } from '../../services/index.js';
import { RouterModule } from '@angular/router';
import { UserSessionService } from '../../../../core/auth/services/index.js';
import { UUIDv4 } from '../../../../shared/models/index.js';

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
    styleUrl: './catalog.scss',
})
export class Catalog implements OnInit, OnDestroy {
    protected booksCount = signal<number>(0);
    protected books = signal<Book[] | null>(null);
    protected isLoading = signal<boolean>(false);
    protected skipBooks = signal<number>(0);
    protected pageSize = signal<number>(10);

    private subscriptions = new Subscription();

    constructor(
        private booksService: BooksService,
        protected userSession: UserSessionService
    ) {
    }

    ngOnInit() {
        this.isLoading.set(true);

        this.fetchBooks();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    fetchBooks() {
        const observables$ = forkJoin([
            this.booksService.getPaginatedBooks(this.skipBooks(), this.pageSize()),
            this.booksService.getBooksCount(),
        ])

        const sub = observables$.subscribe({
            next: (data) => {
                this.books.set(data[0]);
                this.booksCount.set(data[1]);
            },
            complete: () => {
                this.isLoading.set(false);
            },

        }
        );

        this.subscriptions.add(sub);
    }

    onPageChange(e: PageEvent): void {
        this.pageSize.set(e.pageSize);
        this.skipBooks.set(e.pageIndex * this.pageSize());
        this.fetchBooks();
    }

    onDelete(bookId: UUIDv4) {
        const sub = this.booksService.deleteBook(bookId, this.userSession.userToken() as string).subscribe({
            next: () => {
                this.fetchBooks();
            }
        })

        this.subscriptions.add(sub);
    }
}
