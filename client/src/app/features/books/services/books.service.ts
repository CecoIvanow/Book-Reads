import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { buildURL } from '../../../shared/utils/api-url-builder.js';
import { API_PATHS } from '../../../shared/constants/index.js';
import { Book } from '../book.model.js';
import { UUIDv4 } from '../../../shared/models/index.js';
import { Comment } from '../pages/details/models/index.js';


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

    getBookCommentsId(bookId: UUIDv4): Observable<Comment[]> {
        const url = buildURL(API_PATHS.COMMENTS.OF_BOOK.ONLY_ID(bookId));

        return this.httpClient.get<Comment[]>(url);
    }

    getCommentWithOwner(commentId: UUIDv4): Observable<Comment>{
        const url = buildURL(API_PATHS.COMMENTS.WITH_OWNER(commentId));

        return this.httpClient.get<Comment>(url);
    }
}
