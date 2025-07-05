import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Book } from './book.model.js';
import { buildURL } from '../../shared/utils/api-url-builder.js';
import { API_PATHS } from '../../shared/constants/api-constants.js';

@Injectable({
    providedIn: 'root'
})
export class BooksService {
    private defaultSkip: number = 0;
    private defaultSize: number = 10;
    
    constructor(private httpClient: HttpClient) {
    }

    getAllBooks(): Observable<Book[]> {
        const url = buildURL(API_PATHS.BOOKS.ROOT)

        return this.httpClient.get<Book[]>(url);
    }

    getPaginatedBooks(skip: number = this.defaultSkip, size: number = this.defaultSize): Observable<Book[]> {
        const url = buildURL(API_PATHS.BOOKS.PAGINATION(skip, size));

        return this.httpClient.get<Book[]>(url);
    }
}
