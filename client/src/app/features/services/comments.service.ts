import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CommentType } from '../books/models/index.js';
import { API_PATHS } from '../../shared/constants/index.js';
import { buildURL } from '../../shared/utils/index.js';
import { UUIDv4 } from '../../shared/models/index.js';
import { UserSessionService } from '../../core/auth/services/user-session.service.js';


@Injectable({
    providedIn: 'root'
})
export class CommentsService {

    constructor(private httpClient: HttpClient) {
    }

    addComment(bookId: UUIDv4, content: string): Observable<CommentType> {
        const url = buildURL(API_PATHS.COMMENTS.ROOT);

        const body = {
            bookId,
            content,
        }

        return this.httpClient.post<CommentType>(url, body)
    }

    deleteComment(commentId: UUIDv4): Observable<CommentType> {
        const url = buildURL(API_PATHS.COMMENTS.SPECIFIC.ROOT(commentId));

        return this.httpClient.delete<CommentType>(url)
    }

    updateComment(commentId: UUIDv4, content: string): Observable<CommentType> {
        const url = buildURL(API_PATHS.COMMENTS.SPECIFIC.ROOT(commentId));

        const body = {
            content,
        }

        return this.httpClient.patch<CommentType>(url, body)
    }

    getCommentsFromOwner(userId: UUIDv4): Observable<CommentType[]>{
        const url = buildURL(API_PATHS.COMMENTS.ALL.FROM_OWNER(userId));

        return this.httpClient.get<CommentType[]>(url);
    }
}
