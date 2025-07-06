import { AccessToken } from "../../core/auth/models/index.js";
const TOKEN_KEY = 'accessToken';

export function getAccessToken(): AccessToken | null {
    return sessionStorage.getItem(TOKEN_KEY);
}