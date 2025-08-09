import { Component, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Book, CommentType } from '../../../books/models/index.js';
import { CommonModule } from '@angular/common';
import { } from '@angular/common/http';
import { UserSessionService } from '../../../../core/auth/services/user-session.service.js';
import { Subscription } from 'rxjs';
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
export class UserDetails {
    protected user = signal<string | null>(null);
    protected booksCount = signal<number>(0);
    protected commentsCount = signal<number>(0);
    protected userBooks = signal<Book[]>([]);
    protected userComments = signal<CommentType[]>([]);

    constructor(
        protected userSession: UserSessionService,
    ) {
    }
}
