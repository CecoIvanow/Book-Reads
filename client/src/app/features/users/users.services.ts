import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UUIDv4 } from '../../shared/models/index.js';
import { Observable } from 'rxjs';
import { buildURL } from '../../shared/utils/index.js';
import { API_PATHS } from '../../shared/constants/index.js';
import { Like } from '../books/models/index.js';
import { AccessToken } from '../../core/auth/models/index.js';

@Injectable({
    providedIn: 'root'
})
export class UsersServices {

    constructor(private httpClient: HttpClient) {
    }

    getUserInfo(userId: UUIDv4): Observable<Like[]> {
        const url = buildURL(API_PATHS.LIKES.USER_DATA(userId));

        return this.httpClient.get<Like[]>(url);
    }

    addUserEmptyLike(userToken: AccessToken): Observable<Like> {
        const url = buildURL(API_PATHS.LIKES.ROOT);

        const body = {
            bookId: '',
        }

        return this.httpClient.post<Like>(url, body, {
            headers: {
                'X-Authorization': userToken
            }
        })
    }
}
