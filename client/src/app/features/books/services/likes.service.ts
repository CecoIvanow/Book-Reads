import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { buildURL } from '../../../shared/utils/index.js';
import { API_PATHS } from '../../../shared/constants/index.js';
import { UUIDv4 } from '../../../shared/models/index.js';
import { Observable } from 'rxjs';
import { Like } from '../models/index.js';
import { UserSessionService } from '../../../core/auth/services/index.js';

@Injectable({
    providedIn: 'root'
})
export class LikesService {
    constructor(private httpClient: HttpClient, private userSession: UserSessionService) {
    }

    getLikesCount(bookId: UUIDv4): Observable<number> {
        const url = buildURL(API_PATHS.LIKES.OF_BOOK.COUNT(bookId));

        return this.httpClient.get<number>(url);
    }

    addLike(bookId: UUIDv4): Observable<Like> {
        const url = buildURL(API_PATHS.LIKES.ROOT);

        const body = { 'bookId': bookId };

        return this.httpClient.post<Like>(url, body, {
            headers: {
                'X-Authorization': this.userSession.userToken() as string,
            }
        })
    }

    hasBeenLiked(bookId: UUIDv4): Observable<Like[]> {
        const userId = this.userSession.userId() as UUIDv4;

        const url = buildURL(API_PATHS.LIKES.OF_BOOK.FROM_OWNER(bookId, userId));

        return this.httpClient.get<Like[]>(url);
    }

    removeLike(likeId: UUIDv4): Observable<Like> {
        const url = buildURL(API_PATHS.LIKES.DETAILS.ROOT(likeId));

        return this.httpClient.delete<Like>(url, {
            headers: {
                'X-Authorization': this.userSession.userToken() as string,
            }
        })
    }
}