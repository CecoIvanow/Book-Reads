import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UUIDv4 } from '../../shared/models/uuid.model.js';
import { Observable } from 'rxjs';
import { Owner } from '../books/models/owner.model.js';
import { buildURL } from '../../shared/utils/api-url-builder.util.js';
import { UserSessionService } from '../../core/auth/services/user-session.service.js';
import { API_PATHS } from '../../shared/constants/api-paths.const.js';

@Injectable({
    providedIn: 'root'
})
export class UsersServices {

    constructor(private httpClient: HttpClient, private userSession: UserSessionService) {
    }

    addUser(userId: UUIDv4, userData: Owner): Observable<Owner> {
        const url = buildURL(API_PATHS.USERS.DETAILS.ROOT(userId));

        const userToken = this.userSession.userToken() as string;

        return this.httpClient.post<Owner>(url, userData, {
            headers: {
                'X-Authorization': userToken,
            }
        });
    }
}
