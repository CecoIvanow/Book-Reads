import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Book } from '../../models/index.js';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommentType } from '../../models/index.js';
import { BooksService } from '../../books.service.js';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-details',
    imports: [MatCardModule, MatButtonModule],
    templateUrl: './details.html',
    styleUrl: './details.scss'
})
export class Details implements OnInit, OnDestroy {
    protected book: Book | null = null;
    protected comments: CommentType[] = [];

    private subscriptions: Subscription = new Subscription();

    constructor(private bookService: BooksService, private cdr: ChangeDetectorRef) {
    }

    ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }

    ngOnInit(): void {
        const booksSub = this.bookService.getBookWithOwner('c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f').subscribe(data => {
            this.book = data;
            this.cdr.detectChanges();
        });
        
        const commentsIdsSub = this.bookService.getBookCommentsId('c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f').subscribe(data => {
            data.forEach((value) => {
                const commentsSub = this.bookService.getCommentWithOwner(value._id).subscribe(data => {
                    this.comments?.push(data)
                    this.cdr.detectChanges();
                });

                this.subscriptions?.add(commentsSub);
            });
        });

        this.subscriptions?.add(booksSub);
        this.subscriptions?.add(commentsIdsSub);
    }
}
