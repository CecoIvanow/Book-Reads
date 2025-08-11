import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Book, BookPageDetails, CommentType } from '../../models/index.js';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserSessionService } from '../../../../core/auth/services/index.js';
import { UUIDv4 } from '../../../../shared/models/index.js';
import { FAKE_ID } from '../../../../shared/constants/index.js';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.js';
import { BooksService, CommentsService, LikesService } from '../../../services/index.js';

@Component({
    selector: 'app-details',
    imports: [
        MatCardModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        RouterModule,
        ReactiveFormsModule,
        CommonModule,
    ],
    templateUrl: './book-details.html',
    styleUrl: './book-details.scss'
})
export class BookDetails implements OnInit, OnDestroy {
    protected book = signal<Book | null>(null);
    protected comments = signal<CommentType[]>([]);
    protected userLikeId = signal<UUIDv4 | null>(null);
    protected likesCount = signal<number>(0);
    protected clickedComemntEditId = signal<UUIDv4 | null>(null);
    protected commentForm: FormGroup;

    private subscriptions: Subscription = new Subscription();

    constructor(
        private commentsService: CommentsService,
        private booksService: BooksService,
        private likesService: LikesService,
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private dialog: MatDialog,
        private router: Router,
        protected userSession: UserSessionService,
    ) {
        this.commentForm = formBuilder.group({
            content: ['',
                []
            ],
            'create-content': ['',
                []
            ]
        })
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

        const dialogRef = this.dialog.open(ConfirmationDialog, {
            data: {
                title: 'Delete Book',
                message: 'Are you sure you want to delete this book?',
            }
        });

        dialogRef.afterClosed().subscribe(confirmed => {
            if (confirmed) {
                this.booksService.deleteBook(bookId).subscribe({
                    next: () => {
                        this.router.navigate(['/catalog']);
                    }
                });
            };
        });

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

    onCommentSubmit(commentId?: UUIDv4): void {
        const newCommentContent = this.commentForm.get('create-content')?.value;
        const bookId = this.book()?._id;

        if (!bookId || !newCommentContent) {
            return;
        }

        this.clickedComemntEditId.set(null);
        if (commentId) {
        const content = this.commentForm.get('content')?.value;

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

        this.commentForm.reset();
        this.commentsService.addComment(bookId, newCommentContent).subscribe({
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

        const dialogRef = this.dialog.open(ConfirmationDialog, {
            data: {
                title: 'Delete Comment',
                message: 'Are you sure you want to delete this comment?',
            }
        });

        dialogRef.afterClosed().subscribe(confirmed => {
            if (confirmed) {
                this.commentsService.deleteComment(commentId).subscribe({
                    next: () => {
                        this.comments.update(prevComments => prevComments.filter((curComment) => curComment._id !== commentId));
                    }
                });
            };
        });
    }

    onCommentEditClick(commentId: UUIDv4, content: string): void {
        this.clickedComemntEditId.set(commentId);

        this.commentForm.get('content')?.setValue(content);
    }
}
