import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Book } from '../../models/book.model.js';
import { BooksService } from '../../services/books.service.js';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-edit',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    RouterModule
],
  templateUrl: './edit.html',
  styleUrl: './edit.scss'
})
export class Edit implements OnInit, OnDestroy {
    protected book = signal<Book | null>(null);
    protected imagePreviewObjectUrl = signal<string | null>(null);

    private subscriptions = new Subscription();

    constructor(
        private route: ActivatedRoute,
        private booksService: BooksService,
        private router: Router,
    ){
    }

    ngOnInit(): void {
        const bookData: Book = this.route.snapshot.data['bookDetails'].at(0);

        this.book.set(bookData);
    }

    ngOnDestroy(): void {
        const imageObjectUrl = this.imagePreviewObjectUrl();

        if (imageObjectUrl) {
            URL.revokeObjectURL(imageObjectUrl);
            this.imagePreviewObjectUrl.set(null);
        }

        this.subscriptions.unsubscribe();
    }

    onImageUrlInput(e: Event): void {
        const imageUrl = (e.currentTarget as HTMLInputElement).value;
        const urlPattern = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/m;

        if (!urlPattern.test(imageUrl)) {
            const imageObjectUrl = this.imagePreviewObjectUrl();

            if (imageObjectUrl) {
                this.imagePreviewObjectUrl.set(null);
                URL.revokeObjectURL(imageObjectUrl);
            }

            return;
        }

        const sub = this.booksService.getImageBlob(imageUrl).subscribe({
            next: (blob: Blob) => {
                const objectUrl = URL.createObjectURL(blob);

                this.imagePreviewObjectUrl.set(objectUrl);
            }
        })

        this.subscriptions.add(sub);
    }

    onEditBookSubmit(e: Event): void {
        e.preventDefault();

        const bookId = this.route.snapshot.params['bookId']

        const form = e.currentTarget as HTMLFormElement;
        const formData = new FormData(form);
        const bookObjectBody = Object.fromEntries(formData) as object;
        const bookBody = bookObjectBody as Book;

        this.booksService.updateBook(bookId, bookBody).subscribe({
            next: (data: Book) => {
                const bookId = data._id;
                this.router.navigate([`/books/details/${bookId}`])
            }
        })

    }
}
