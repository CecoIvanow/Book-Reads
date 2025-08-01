import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Book } from '../../models/index.js';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommentType } from '../../models/index.js';
import { BooksService } from '../../books.service.js';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserSessionService } from '../../../../core/auth/services/index.js';
import { UUIDv4 } from '../../../../shared/models/uuid.model.js';

@Component({
    selector: 'app-details',
    imports: [
        MatCardModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule
    ],
    templateUrl: './details.html',
    styleUrl: './details.scss'
})
export class Details implements OnInit, OnDestroy {
    protected book!: Book;
    protected comments: CommentType[] = [];

    private subscriptions: Subscription = new Subscription();

    constructor(
        private booksService: BooksService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef,
        private router: Router,
        protected userSession: UserSessionService,
    ) {
    }

    ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }

    ngOnInit(): void {
        const bookId = this.route.snapshot.params['bookId']

        const booksSub = this.booksService.getBookWithOwner(bookId).subscribe(data => {
            this.book = data;
            this.cdr.detectChanges();

            this.book?.comments.forEach((commentId) => {
                const commentsSub = this.booksService.getCommentWithOwner(commentId).subscribe(data => {
                    this.comments?.push(data)
                    this.cdr.detectChanges();
                });
                this.subscriptions?.add(commentsSub);
            })

        });

        this.subscriptions?.add(booksSub);
    }

        onDelete(bookId: UUIDv4) {
            const sub = this.booksService.deleteBook(bookId).subscribe({
                next: () => {
                    this.router.navigate(['/catalog']);
                }
            })
    
            this.subscriptions.add(sub);
        }
}
