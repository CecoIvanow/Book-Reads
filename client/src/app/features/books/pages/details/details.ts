import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Book } from '../../models/index.js';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommentType } from '../../models/index.js';
import { BooksService } from '../../books.service.js';
import { forkJoin, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserSessionService } from '../../../../core/auth/services/index.js';
import { UUIDv4 } from '../../../../shared/models/uuid.model.js';
import { LikesService } from '../../likes.service.js';

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
    protected book: Book | null = null;
    protected comments: CommentType[] = [];
    protected isLiked = signal<boolean>(false);
    protected likesCount = signal<number>(0);

    private subscriptions: Subscription = new Subscription();

    constructor(
        private booksService: BooksService,
        private likesService: LikesService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef,
        private router: Router,
        protected userSession: UserSessionService,
    ) {
        if (userSession.userId()) {
        }
    }

    ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }

    ngOnInit(): void {
        const bookId = this.route.snapshot.params['bookId'];

        const observables$ = forkJoin([
            this.booksService.getBookWithOwner(bookId),
            this.likesService.getBookLikesCount(bookId),
        ])

        const sub = observables$.subscribe(data => {
            this.likesCount.set(data[1]);

            this.book = data[0];

            this.cdr.detectChanges();

            this.book?.comments.forEach((commentId) => {
                const commentsSub = this.booksService.getCommentWithOwner(commentId).subscribe(data => {
                    this.comments.push(data)
                    this.cdr.detectChanges();
                });
                this.subscriptions.add(commentsSub);
            })

        })

        this.subscriptions.add(sub);
    }

    onDelete(): void {
        const bookId = this.book?._id as string;

        const sub = this.booksService.deleteBook(bookId).subscribe({
            next: () => {
                this.router.navigate(['/catalog']);
            }
        })

        this.subscriptions.add(sub);
    }

    onLike(): void {
        const userId = this.userSession.userId() as string;

        this.isLiked.set(true);
        this.likesCount.update(count => count + 1);
    }
    
    onUnlike(): void {
        const userId = this.userSession.userId() as string;
        
        this.isLiked.set(false);
        this.likesCount.update(count => count - 1);
    }
}
