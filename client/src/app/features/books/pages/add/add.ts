import { Component, OnDestroy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BooksService } from '../../services/books.service.js';
import { Subscription } from 'rxjs';
import { Book } from '../../models/book.model.js';
import { Router } from '@angular/router';

@Component({
    selector: 'app-add',
    imports: [MatInputModule, MatFormFieldModule, MatButtonModule],
    templateUrl: './add.html',
    styleUrl: './add.scss'
})
export class Add implements OnDestroy {
    protected previewImageObjectUrl = signal<string | null>(null)

    private subscriptions = new Subscription();

    constructor(private booksService: BooksService, private router: Router) {
    }

    ngOnDestroy(): void {
        const imageObjectUrl = this.previewImageObjectUrl();

        if (imageObjectUrl) {
            URL.revokeObjectURL(imageObjectUrl);
            this.previewImageObjectUrl.set(null);
        }

        this.subscriptions.unsubscribe();
    }

    onImageUrlInput(e: Event): void {
        const imageUrl = (e.currentTarget as HTMLInputElement).value;
        const urlPattern = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/m;

        if (!urlPattern.test(imageUrl)) {
            return;
        }

        const sub = this.booksService.getImageBlob(imageUrl).subscribe({
            next: (blob: Blob) => {
                const objectUrl = URL.createObjectURL(blob);

                this.previewImageObjectUrl.set(objectUrl);
            }
        })

        this.subscriptions.add(sub);
    }

    onAddBookSubmit(e: Event): void {
        e.preventDefault();

        const form = e.currentTarget as HTMLFormElement;
        const formData = new FormData(form);
        const bookBody = Object.fromEntries(formData) as object;

        this.booksService.addBook(bookBody).subscribe({
            next: (data: Book) => {
                const bookId = data._id;
                this.router.navigate([`/books/details/${bookId}`])
            }
        })
        
    }
}
