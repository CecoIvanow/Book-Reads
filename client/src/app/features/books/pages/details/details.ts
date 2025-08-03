import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Book, BookPageDetails, CommentType } from '../../models/index.js';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { BooksService, CommentsService, LikesService } from '../../services/index.js';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Data, Router } from '@angular/router';
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
    protected book = signal<Book | null>(null);
    protected comments = signal<CommentType[]>([]);
    protected userLikeId = signal<UUIDv4 | null>(null);
    protected likesCount = signal<number>(0);
    protected clickedComemntEditId = signal<UUIDv4 | null>(null);
    protected commentContent = signal<string | null>(null);

    private subscriptions: Subscription = new Subscription();

    constructor(
        private booksService: BooksService,
        private likesService: LikesService,
        private commentsService: CommentsService,
        private route: ActivatedRoute,
        private router: Router,
        protected userSession: UserSessionService,
    ) {
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    ngOnInit(): void {
        const [bookData, totalLikesCount, userLike, comments]: BookPageDetails = this.route.snapshot.data['bookDetails'];

        this.book.set(bookData);
        this.likesCount.set(totalLikesCount);
        this.comments.set([...comments].reverse());

        if (userLike.length !== 0) {
            this.userLikeId.set(userLike[0]._id);
        }
    }

    onBookDelete(): void {
        const bookId = this.book()?._id as string;
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
        const bookId = this.book()?._id;

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

    onCommentSubmit(e: Event, commentId?: UUIDv4): void {
        e.preventDefault();

        const form = e.currentTarget as HTMLFormElement
        const formData = new FormData(form);
        const content = formData.get('content') as string;

        const bookId = this.book()?._id;

        if (!bookId) {
            return;
        }

        if (commentId) {
            this.clickedComemntEditId.set(null);

            this.commentsService.updateComment(commentId, content).subscribe({
                next: (updatedComment) => {
                    this.comments.update(prevComments => prevComments.map((curComment) => {
                        if (curComment._id === updatedComment._id) {
                            const patchedComment = curComment;

                            patchedComment.content = updatedComment.content;

                            return patchedComment;
                        }

                        return curComment;
                    }));

                }
            })

            return;
        }

        form.reset();
        this.commentsService.addComment(bookId, content).subscribe({
            next: (respComment) => {
                const newComment = respComment;
                respComment.owner = {
                    firstName: this.userSession.firstName() as string,
                    lastName: this.userSession.lastName() as string,
                    _id: this.userSession.userId() as string,
                    email: this.userSession.email() as string,
                    username: this.userSession.username() as string,
                }

                this.comments.update(prevComments => [
                    newComment,
                    ...prevComments
                ])
            }
        })
    }

    onCommentDelete(commentId: UUIDv4): void {
        this.commentsService.deleteComment(commentId).subscribe({
            next: () => {
                this.comments.update(prevComments => prevComments.filter((curComment) => curComment._id !== commentId));
            }
        })
    }

    onCommentEditClick(commentId: UUIDv4, content: string): void {
        this.clickedComemntEditId.set(commentId);
        this.commentContent.set(content);
    }

    onCommentContentChange(e: Event): void {
        const newContent = (e.currentTarget as HTMLInputElement).value
        console.log(newContent);

        this.commentContent.set(newContent);
    }
}
