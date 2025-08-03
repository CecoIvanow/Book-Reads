import { ActivatedRoute, ResolveFn } from '@angular/router';
import { Book, CommentType, Like } from './models/index.js';
import { inject } from '@angular/core';
import { BooksService } from './services/books.service.js';
import { LikesService } from './services/likes.service.js';
import { forkJoin } from 'rxjs';

export const bookDetailsResolver: ResolveFn<[Book, number, Like[], CommentType[]]> = (route, state) => {
    const booksService = inject(BooksService);
    const likesService = inject(LikesService);
    const activatedRoute = inject(ActivatedRoute);

    const bookId = route.params['bookId'];

    return forkJoin([
        booksService.getBookWithOwner(bookId),
        likesService.getLikesCount(bookId),
        likesService.hasBeenLiked(bookId),
        booksService.getBookComments(bookId),
    ])
};
