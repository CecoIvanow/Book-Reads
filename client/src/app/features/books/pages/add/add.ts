import { Component, OnDestroy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { Book } from '../../models/index.js';
import { Router, RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BooksService } from '../../../services/index.js';

@Component({
    selector: 'app-add',
    imports: [
        MatInputModule,
        MatFormFieldModule,
        MatButtonModule,
        MatIcon,
        ReactiveFormsModule,
        RouterModule,
    ],
    templateUrl: './add.html',
    styleUrl: './add.scss'
})
export class Add implements OnDestroy {
    protected imagePreviewObjectUrl = signal<string | null>(null);
    protected bookAddForm: FormGroup;

    private urlPattern = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/m;
    private subscriptions = new Subscription();

    constructor(
        private booksService: BooksService,
        private router: Router,
        private formBuilder: FormBuilder
    ) {
        this.bookAddForm = formBuilder.group({
            title: ['',
                [Validators.required]
            ],
            author: ['',
                [Validators.required]
            ],
            img: ['',
                [Validators.required, Validators.pattern(this.urlPattern)]
            ],
            summary: ['',
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
        const imageUrl = this.bookAddForm.get('img')?.value as string;
        
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

    onBookAddSubmit(): void {
        if (this.bookAddForm.invalid) {
            return;
        }

        const bookBody = this.bookAddForm.value;

        this.booksService.addBook(bookBody).subscribe({
            next: (data: Book) => {
                const bookId = data._id;
                this.router.navigate([`/books/details/${bookId}`])
            }
        })
        
    }
}
