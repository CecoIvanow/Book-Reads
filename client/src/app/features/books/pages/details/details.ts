import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Book } from '../../models/index.js';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommentType } from '../../models/index.js';
import { BooksService } from '../../books.service.js';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

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

    constructor(
        private bookService: BooksService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef) {
    }

    ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }

    ngOnInit(): void {
        const bookId = this.route.snapshot.params['bookId']

        const booksSub = this.bookService.getBookWithOwner(bookId).subscribe(data => {
            this.book = data;
            this.cdr.detectChanges();

            this.book?.comments.forEach((commentId) => {
                console.log(commentId);
                const commentsSub = this.bookService.getCommentWithOwner(commentId).subscribe(data => {
                    this.comments?.push(data)
                    this.cdr.detectChanges();
                });
                this.subscriptions?.add(commentsSub);
            })

        });

        this.subscriptions?.add(booksSub);
    }
}
