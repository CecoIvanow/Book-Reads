import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { UsersServices } from './users.services.js';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { UserPageDetails } from './user-book-details.model.js';
import { BooksService, CommentsService } from '../services/index.js';

export const usersDetailsResolver: ResolveFn<UserPageDetails | RedirectCommand> = (route, state) => {
    const usersService = inject(UsersServices);
    const booksService = inject(BooksService);
    const commentsService = inject(CommentsService);
    const router = inject(Router);

    const userId = route.params['userId'];

    return usersService.getUserInfo(userId).pipe(
        switchMap(userInfo => {
            if (userInfo.length === 0) {
                return of(new RedirectCommand(router.parseUrl('/404')));
            }

            return forkJoin([
                booksService.getBooksFromOwner(userId),
                commentsService.getCommentsFromOwner(userId),
                of(userInfo)
            ])
        }),
        catchError(() => {
            return of(new RedirectCommand(router.parseUrl('/404')));
        })
    );
};
