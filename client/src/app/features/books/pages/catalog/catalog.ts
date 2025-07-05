import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Book } from '../../book.model.js';
import { BooksService } from '../../books.service.js';

@Component({
    selector: 'app-catalog-page',
    imports: [MatCardModule, MatButtonModule, MatProgressSpinner],
    templateUrl: './catalog.html',
    styleUrl: './catalog.scss'
})
export class Catalog {
    protected books$: Book[] | null = null;
    protected isLoading: boolean = false;

    constructor(private booksServices: BooksService) {
    }

    ngOnInit() {
        this.isLoading = true;
        this.booksServices.getPaginatedBooks().subscribe({
            next: (data) => {
                this.books$ = data;
            },
            complete:() => {
                this.isLoading = false;
            },
        });
    }
}
