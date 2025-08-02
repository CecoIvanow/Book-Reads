import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Book } from '../../models/index.js';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommentType } from '../../models/index.js';
import { BooksService, LikesService } from '../../services/index.js';
import { forkJoin, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserSessionService } from '../../../../core/auth/services/index.js';
import { UUIDv4 } from '../../../../shared/models/index.js';
import { FAKE_ID } from '../../../../shared/constants/index.js';

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
    protected userLikeId = signal<UUIDv4 | null>(null);
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
    }

    ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }

    ngOnInit(): void {
        const bookId = this.route.snapshot.params['bookId'];

        const observables$ = forkJoin([
            this.booksService.getBookWithOwner(bookId),
            this.likesService.getLikesCount(bookId),
            this.likesService.hasBeenLiked(bookId),
            this.booksService.getBookComments(bookId),
        ])

        const sub = observables$.subscribe(data => {
            this.book = data[0];
            this.likesCount.set(data[1]);

            if (data[2].length > 0) {
                this.userLikeId.set(data[2][0]._id);
            }

            this.comments = data[3];

            this.cdr.detectChanges();
        })

        this.subscriptions.add(sub);
    }

    onDelete(): void {
        const bookId = this.book?._id as string;
        const userToken = this.userSession.userToken();

        if (!userToken) {
            return;
        }

        const sub = this.booksService.deleteBook(bookId, userToken).subscribe({
            next: () => {
                this.router.navigate(['/catalog']);
            }
        })

        this.subscriptions.add(sub);
    }

    onLike(): void {
        const bookId = this.book?._id;

        if (!bookId || this.userLikeId() === FAKE_ID) {
            return;
        }

        this.userLikeId.set(FAKE_ID);
        this.likesCount.update(count => count + 1);
        this.likesService.addLike(bookId).subscribe({
            next: (data) => {
                this.userLikeId.set(data._id);
            },
            error: () => {
                this.userLikeId.set(null);
                this.likesCount.update(count => count - 1);
            }
        });
    }

    onUnlike(): void {
        const likeId = this.userLikeId();

        if (!likeId || likeId === FAKE_ID) {
            return;
        }

        this.userLikeId.set(null);
        this.likesCount.update(count => count - 1);
        this.likesService.removeLike(likeId).subscribe({
            error: () => {
                this.userLikeId.set(likeId);
                this.likesCount.update(count => count + 1);
            }
        });
    }
}
