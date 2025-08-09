import { Component, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Book, CommentType } from '../../../books/models/index.js';
import { CommonModule } from '@angular/common';
import { BooksService, CommentsService } from '../../../books/services/index.js';
import { UserSessionService } from '../../../../core/auth/services/user-session.service.js';
import { MatButtonModule } from '@angular/material/button';

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
    protected user = signal<string | null>(null);
    protected booksCount = signal<number>(0);
    protected commentsCount = signal<number>(0);
    protected userBooks = signal<Book[]>([]);
    protected userComments = signal<CommentType[]>([]);

    constructor(
        protected userSession: UserSessionService,
        private booksService: BooksService,
        private commentsService: CommentsService,
        private route: ActivatedRoute,
    ) {
    }

    ngOnInit(): void {
        const userId = this.route.snapshot.params['userId']
        
        this.booksService.getBooksFromOwner(userId).subscribe({
            next: (books) => {
                this.userBooks.set(books);
                this.booksCount.set(books.length);
            }
        })

        this.commentsService.getCommentsFromOwner(userId).subscribe({
            next: (comments) => {              
                this.userComments.set(comments);
                this.commentsCount.set(comments.length);
            }
        })
    }
}
