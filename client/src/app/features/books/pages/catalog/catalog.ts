import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Book } from '../../models/index.js';
import { debounceTime, distinctUntilChanged, forkJoin, Subscription, switchMap, take, timer } from 'rxjs';
import { RouterModule } from '@angular/router';
import { UserSessionService } from '../../../../core/auth/services/index.js';
import { UUIDv4 } from '../../../../shared/models/index.js';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.js';
import { BooksService } from '../../../services/books.service.js';
import { BookItem } from "../../../components/book-item/book-item";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-catalog-page',
    imports: [
        MatCardModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatPaginatorModule,
        RouterModule,
        CommonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        BookItem
    ],
    templateUrl: './catalog.html',
    styleUrl: './catalog.scss',
})
export class Catalog implements OnInit, OnDestroy {
    protected booksCount = signal<number>(0);
    protected books = signal<Book[] | null>(null);
    protected skipBooks = signal<number>(0);
    protected pageSize = signal<number>(10);

    private subscriptions = new Subscription();
    private searchSubscription: Subscription | null = null;

    constructor(
        private dialog: MatDialog,
        private booksService: BooksService,
        protected userSession: UserSessionService,
    ) {
    }

    ngOnInit() {
        this.fetchBooks();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    onSearchInput(event: Event) {
        const currentInput = event.currentTarget as HTMLInputElement;
        const searchValue = currentInput.value.trim();

        if (this.searchSubscription) {
            this.searchSubscription.unsubscribe();
            this.searchSubscription = null;
        }

        if (!searchValue) {
            this.searchSubscription = timer(1250).subscribe({
                next: () => {
                    this.skipBooks.set(0);
                    this.pageSize.set(10);
                    this.fetchBooks();
                },
                complete: () => {
                    this.searchSubscription = null;
                }
            });
            return;
        }

        this.searchSubscription = timer(1250).pipe(
            switchMap(() => {
                return this.booksService.getBooksByName(searchValue);
            })
        ).subscribe({
            next: results => {
                this.books.set(results);
                this.pageSize.set(results.length);
            },
            complete: () => {
                this.searchSubscription = null;
            }
        })
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
            }
        });

        this.subscriptions.add(sub);
    }

    onPageChange(e: PageEvent): void {
        this.pageSize.set(e.pageSize);
        this.skipBooks.set(e.pageIndex * this.pageSize());
        this.fetchBooks();
    }

    onDelete(bookId: UUIDv4) {
        const dialogRef = this.dialog.open(ConfirmationDialog, {
            data: {
                title: 'Delete Book',
                message: 'Are you sure you want to delete this book?',
            }
        });

        dialogRef.afterClosed().subscribe(confirmed => {
            if (confirmed) {
                this.booksService.deleteBook(bookId).subscribe({
                    next: () => {
                        this.fetchBooks();
                    }
                })
            };
        });
    }
}
