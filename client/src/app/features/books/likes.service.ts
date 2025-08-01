import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { buildURL } from '../../shared/utils/index.js';
import { API_PATHS } from '../../shared/constants/index.js';
import { UUIDv4 } from '../../shared/models/index.js';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LikesService {

  constructor(private httpClient: HttpClient)
  {}

  getLikesCount(bookId: UUIDv4): Observable<number> {
    const url = buildURL(API_PATHS.LIKES.OF_BOOK.COUNT(bookId));

    return this.httpClient.get<number>(url);
  }
}
