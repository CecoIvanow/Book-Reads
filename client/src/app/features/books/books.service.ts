import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class BooksService {
    private apiUrl = 'http://localhost:3030/books';

    constructor(private httpClient: HttpClient) {
    }


}
