import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_PATHS } from '../../../shared/constants/index.js';
import { UUIDv4 } from '../../../shared/models/index.js';
import { buildURL } from '../../../shared/utils/index.js';
import { Book } from '../models/index.js';
import { CommentType } from '../models/index.js';
import { AccessToken } from '../../../core/auth/models/index.js';
import { UserSessionService } from '../../../core/auth/services/user-session.service.js';


@Injectable({
    providedIn: 'root'
})
export class BooksService {
    private defaultSkip: number = 0;
    private defaultSize: number = 10;

    constructor(private httpClient: HttpClient, private userSession: UserSessionService) {
    }

    getAllBooks(): Observable<Book[]> {
        const url = buildURL(API_PATHS.BOOKS.ROOT);

        return this.httpClient.get<Book[]>(url);
    }

    getPaginatedBooks(skip: number = this.defaultSkip, size: number = this.defaultSize): Observable<Book[]> {
        const url = buildURL(API_PATHS.BOOKS.PAGINATION(skip, size));

        return this.httpClient.get<Book[]>(url);
    }

    getBooksCount(): Observable<number> {
        const url = buildURL(API_PATHS.BOOKS.COUNT);

        return this.httpClient.get<number>(url);
    }

    getBook(id: UUIDv4): Observable<Book> {
        const url = buildURL(API_PATHS.BOOKS.DETAILS.ROOT(id));

        return this.httpClient.get<Book>(url);
    }

    getBookWithOwner(id: UUIDv4): Observable<Book> {
        const url = buildURL(API_PATHS.BOOKS.DETAILS.WITH_OWNER(id));

        return this.httpClient.get<Book>(url);
    }

    getBookComments(bookId: UUIDv4): Observable<CommentType[]> {
        const url = buildURL(API_PATHS.BOOKS.DETAILS.COMMENTS(bookId));

        return this.httpClient.get<CommentType[]>(url);
    }

    deleteBook(id: UUIDv4, userToken: AccessToken): Observable<unknown> {
        const url = buildURL(API_PATHS.BOOKS.DETAILS.ROOT(id));

        return this.httpClient.delete(url, {
            headers: {
                'X-Authorization': userToken,
            }
        })
    }

    getImageBlob(imageUrl: string): Observable<Blob> {
        return this.httpClient.get(imageUrl, {
            responseType: 'blob'
        })
    }

    addBook(body: object): Observable<Book> {
        const url = buildURL(API_PATHS.BOOKS.ROOT);
        const userToken = this.userSession.userToken() as string;

        return this.httpClient.post<Book>(url, body, {
            headers: {
                'X-Authorization': userToken,
            }
        })
    }

    updateBook(bookId: UUIDv4, body: Book): Observable<Book> {
        const url = buildURL(API_PATHS.BOOKS.DETAILS.ROOT(bookId));
        const userToken = this.userSession.userToken() as string;

        return this.httpClient.patch<Book>(url, body, {
            headers: {
                'X-Authorization': userToken,
            }
        })
    }
}
