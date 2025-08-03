import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { BookPageDetails} from './models/index.js';
import { inject } from '@angular/core';
import { BooksService } from './services/books.service.js';
import { LikesService } from './services/likes.service.js';
import { catchError, forkJoin, of } from 'rxjs';


export const bookDetailsResolver: ResolveFn<BookPageDetails | RedirectCommand> = (route, state) => {
    const booksService = inject(BooksService);
    const likesService = inject(LikesService);
    const router = inject(Router);

    const bookId = route.params['bookId'];

    return forkJoin([
        booksService.getBookWithOwner(bookId),
        likesService.getLikesCount(bookId),
        likesService.hasBeenLiked(bookId),
        booksService.getBookComments(bookId),
    ]).pipe(
        catchError(error => {
            console.error(error)
            return of(new RedirectCommand(router.parseUrl('/404')));
        })
    )
};
