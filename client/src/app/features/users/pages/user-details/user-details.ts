import { Component, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Book, CommentType, Owner } from '../../../books/models/index.js';
import { CommonModule } from '@angular/common';
import { UserSessionService } from '../../../../core/auth/services/index.js';
import { MatButtonModule } from '@angular/material/button';
import { UserPageDetails } from '../../user-book-details.model.js';
import { UUIDv4 } from '../../../../shared/models/index.js';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.js';
import { BooksService, CommentsService } from '../../../services/index.js';
import { BookItem } from '../../../components/book-item/book-item.js';

@Component({
    selector: 'app-user-details',
    imports: [
        MatIconModule,
        MatCardModule,
        RouterModule,
        CommonModule,
        MatButtonModule,
        MatFormFieldModule,
        ReactiveFormsModule,
        MatInputModule,
        BookItem,
    ],
    templateUrl: './user-details.html',
    styleUrl: './user-details.scss'
})
export class UserDetails implements OnInit {
    protected user = signal<Owner | null>(null);
    protected booksCount = signal<number>(0);
    protected commentsCount = signal<number>(0);
    protected userBooks = signal<Book[]>([]);
    protected userComments = signal<CommentType[]>([]);
    protected clickedComemntEditId = signal<UUIDv4 | null>(null);
    protected commentForm: FormGroup;

    constructor(
        private route: ActivatedRoute,
        private booksService: BooksService,
        private commentsService: CommentsService,
        private formBuilder: FormBuilder,
        private dialog: MatDialog,
        protected userSession: UserSessionService,
    ) {
        this.commentForm = formBuilder.group({
            content: ['',
                []
            ]
        })
    }

    ngOnInit(): void {
        const [userBooks, userComments, userEmptyLike]: UserPageDetails = this.route.snapshot.data['userDetails'];
        const userData = userEmptyLike.at(0)?.owner as Owner;

        this.userBooks.set(userBooks);
        this.booksCount.set(userBooks.length);

        this.userComments.set(userComments);
        this.commentsCount.set(userComments.length);

        this.user.set(userData);
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
                        this.userComments.update(prev =>
                            prev.filter(c => c._id !== commentId)
                        );
                    }
                });
            };
        });
    }

    onBookDelete(bookId: UUIDv4): void {
        const userToken = this.userSession.userToken();

        console.log(bookId);

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
                        this.userBooks.update(prevBooks => prevBooks.filter((curBook) => curBook._id !== bookId));
                    }
                });
            };
        });
    }

    onCommentSubmit(commentId: UUIDv4, bookId: UUIDv4): void {
        const content = this.commentForm.get('content')?.value;

        if (!bookId || !content) {
            return;
        }

        if (commentId) {
            this.clickedComemntEditId.set(null);

            this.commentsService.updateComment(commentId, content).subscribe({
                next: (updatedComment) => {
                    this.userComments.update(prevComments => prevComments.map((curComment) => {
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

                this.userComments.update(prevComments => [
                    newComment,
                    ...prevComments
                ])
            }
        })
    }

    onCommentEditClick(commentId: UUIDv4, content: string): void {
        this.clickedComemntEditId.set(commentId);

        this.commentForm.get('content')?.setValue(content);
    }
}
