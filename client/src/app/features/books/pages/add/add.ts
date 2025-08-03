import { Component, OnDestroy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BooksService } from '../../services/books.service.js';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-add',
    imports: [MatInputModule, MatFormFieldModule, MatButtonModule],
  templateUrl: './add.html',
  styleUrl: './add.scss'
})
export class Add implements OnDestroy {
    protected previewImageObjectUrl = signal<string | null>(null)

    private subscriptions = new Subscription();

    constructor(private booksService: BooksService){
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
}
