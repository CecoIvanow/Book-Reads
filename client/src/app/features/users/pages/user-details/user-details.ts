import { Component, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Book, CommentType } from '../../../books/models/index.js';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-details',
  imports: [
    MatIconModule,
    MatCardModule,
    RouterModule,
    CommonModule,
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
}
