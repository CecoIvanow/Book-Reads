import { Component, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RedirectCommand, RouterModule } from '@angular/router';
import { Book, CommentType, Owner } from '../../../books/models/index.js';
import { CommonModule } from '@angular/common';
import { UserSessionService } from '../../../../core/auth/services/index.js';
import { MatButtonModule } from '@angular/material/button';
import { UserPageDetails } from '../../user-book-details.model.js';
import { UUIDv4 } from '../../../../shared/models/index.js';
import { CommentsService } from '../../../books/services/comments.service.js';

@Component({
    selector: 'app-user-details',
    imports: [
        MatIconModule,
        MatCardModule,
        RouterModule,
        CommonModule,
        MatButtonModule
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

    constructor(
        private route: ActivatedRoute,
        private commentsService: CommentsService,
        protected userSession: UserSessionService,
    ) {
    }

    ngOnInit(): void | RedirectCommand {
        const [userBooks, userComments, userEmptyLike]: UserPageDetails = this.route.snapshot.data['userDetails'];
        const userData = userEmptyLike.at(0)?.owner as Owner;

        this.userBooks.set(userBooks);
        this.booksCount.set(userBooks.length);

        this.userComments.set(userComments);
        this.commentsCount.set(userComments.length);

        this.user.set(userData);
    }

    onCommentDelete(commentId: UUIDv4): void {
        this.commentsService.deleteComment(commentId).subscribe({
            next: () => {
                this.userComments.update(prevComments => prevComments.filter((curComment) => curComment._id !== commentId));
            }
        })
    }
}
