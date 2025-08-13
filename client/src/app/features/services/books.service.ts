import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Book, CommentType } from '../books/models/index.js';
import { API_PATHS } from '../../shared/constants/index.js';
import { buildURL } from '../../shared/utils/index.js';
import { UserSessionService } from '../../core/auth/services/index.js';
import { UUIDv4 } from '../../shared/models/uuid.model.js';


@Injectable({
    providedIn: 'root'
})
export class BooksService {
    private defaultSkip: number = 0;
    private defaultSize: number = 10;

    constructor(private httpClient: HttpClient) {
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

    deleteBook(id: UUIDv4): Observable<unknown> {
        const url = buildURL(API_PATHS.BOOKS.DETAILS.ROOT(id));

        return this.httpClient.delete(url)
    }

    getImageBlob(imageUrl: string): Observable<Blob> {
        return this.httpClient.get(imageUrl, {
            responseType: 'blob'
        })
    }

    addBook(body: object): Observable<Book> {
        const url = buildURL(API_PATHS.BOOKS.ROOT);
        return this.httpClient.post<Book>(url, body)
    }

    updateBook(bookId: UUIDv4, body: Book): Observable<Book> {
        const url = buildURL(API_PATHS.BOOKS.DETAILS.ROOT(bookId));

        return this.httpClient.patch<Book>(url, body)
    }

    getBooksFromOwner(userId: UUIDv4): Observable<Book[]> {
        const url = buildURL(API_PATHS.BOOKS.ALL.FROM_OWNER(userId));

        return this.httpClient.get<Book[]>(url);
    }

    getBooksByName(contents: string): Observable<Book[]> {
        const url = buildURL(API_PATHS.BOOKS.SEARCH_BY_NAME(contents));

        return this.httpClient.get<Book[]>(url);
    }
}
