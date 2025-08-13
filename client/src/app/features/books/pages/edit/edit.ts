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
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../../../../firebase/config.js';
import { UUIDv4 } from '../../../../shared/models/uuid.model.js';
import { LoadingOverlay } from '../../../../shared/components/loading-overlay/loading-overlay.js';

@Component({
    selector: 'app-edit',
    imports: [
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCardModule,
        RouterModule,
        ReactiveFormsModule,
        LoadingOverlay,
    ],
    templateUrl: './edit.html',
    styleUrl: './edit.scss'
})
export class Edit implements OnDestroy {
    protected book = signal<Book | null>(null);
    protected imagePreviewObjectUrl = signal<string | null>(null);
    protected bookEditForm: FormGroup;
    protected isLoading = signal<boolean>(false);

    private uploadedImage: File | null = null;
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

    onImageUpload(event: Event) {
        const inputEl = event.currentTarget as HTMLInputElement;

        if (!inputEl.files || inputEl.files.length === 0) {
            return;
        }

        const imageFile = inputEl.files[0];
        this.uploadedImage = imageFile;

        const imageObject = URL.createObjectURL(imageFile);
        this.imagePreviewObjectUrl.set(imageObject);
    }

    async imageUploadToStorage(bookId: UUIDv4): Promise<string> {
        const imageRef = ref(storage, `/books/${bookId}/cover`);
        const resp = await uploadBytes(imageRef, this.uploadedImage as Blob);
        return await getDownloadURL(resp.ref);
    }

    async onEditBookSubmit(): Promise<void> {
        if (this.bookEditForm.invalid) {
            return;
        }

        this.isLoading.set(true);

        const bookId = this.route.snapshot.params['bookId'] as UUIDv4;
        const bookBody = this.bookEditForm.value as Book;
        
        if (this.uploadedImage) {
            const newImageUrl = await this.imageUploadToStorage(bookId);
            bookBody.img = newImageUrl;
            
        } else {
            bookBody.img = this.book()?.img as string;
        }

        this.booksService.updateBook(bookId, bookBody).subscribe({
            next: (data: Book) => {
                const bookId = data._id;
                this.router.navigate([`/books/details/${bookId}`])
            },
            complete: () => {
                this.isLoading.set(false);
            }
        })

    }
}
