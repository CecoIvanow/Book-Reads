import { Component, OnDestroy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom, Subscription } from 'rxjs';
import { Book } from '../../models/index.js';
import { Router, RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BooksService } from '../../../services/index.js';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../../../../firebase/config.js';
import { UUIDv4 } from '../../../../shared/models/uuid.model.js';

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
    protected bookAddForm: FormGroup;
    protected imagePreviewObjectUrl = signal<string | null>(null);
    protected isLoading = signal<boolean>(false);

    private uploadedImage: File | null = null;
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

    async imageUploadToStorage (bookId: UUIDv4): Promise<string> {
        const imageRef = ref(storage, `/books/${bookId}/cover`);
        const resp = await uploadBytes(imageRef, this.uploadedImage as Blob);
        return await getDownloadURL(resp.ref);
    }

    async onBookAddSubmit(): Promise<void> {
        if (this.bookAddForm.invalid && !this.uploadedImage) {
            return;
        }

        this.isLoading.set(true);

        const bookBody: Book = this.bookAddForm.value;
        bookBody.img = 'placeholder';

        const bookData = await firstValueFrom(this.booksService.addBook(bookBody));
        const bookId = bookData._id;

        const actualImageUrl = await this.imageUploadToStorage(bookId);

        const actualBookBody = bookData;
        actualBookBody.img = actualImageUrl;

        await firstValueFrom(this.booksService.updateBook(bookId, actualBookBody));

        this.isLoading.set(false);

        this.router.navigate([`/books/details/${bookId}`]);
    }
}
