import { Component, OnDestroy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Book } from '../../models/index.js';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BooksService } from '../../../services/books.service.js';

@Component({
  selector: 'app-edit',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    RouterModule,
    ReactiveFormsModule,
],
  templateUrl: './edit.html',
  styleUrl: './edit.scss'
})
export class Edit implements OnDestroy {
    protected book = signal<Book | null>(null);
    protected imagePreviewObjectUrl = signal<string | null>(null);
    protected bookEditForm: FormGroup; 

    private urlPattern = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/m;
    private subscriptions = new Subscription();

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private formBuilder: FormBuilder,
        private booksService: BooksService,
    ) {
        const bookData: Book = this.route.snapshot.data['bookDetails'].at(0);
        this.book.set(bookData);

        this.bookEditForm = formBuilder.group({
            title: [this.book()?.title, 
                [Validators.required]
            ],
            author: [this.book()?.author,
                [Validators.required]
            ],
            img: [this.book()?.img,
                [Validators.required, Validators.pattern(this.urlPattern)]
            ],
            summary: [this.book()?.summary,
                [Validators.required]
            ],

        })
    }

    ngOnDestroy(): void {
        const imageObjectUrl = this.imagePreviewObjectUrl();

        if (imageObjectUrl) {
            URL.revokeObjectURL(imageObjectUrl);
            this.imagePreviewObjectUrl.set(null);
        }

        this.subscriptions.unsubscribe();
    }

    onImageUrlInput(): void {
        const imageUrl = this.bookEditForm.get('img')?.value;

        if (!this.urlPattern.test(imageUrl)) {
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

    onEditBookSubmit(): void {
        if (this.bookEditForm.invalid) {
            return;
        }

        const bookId = this.route.snapshot.params['bookId'];
        const bookBody = this.bookEditForm.value;

        this.booksService.updateBook(bookId, bookBody).subscribe({
            next: (data: Book) => {
                const bookId = data._id;
                this.router.navigate([`/books/details/${bookId}`])
            }
        })

    }
}
