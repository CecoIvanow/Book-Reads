import { BASE_API_URL } from "../constants/index.js"

export function buildURL(path: string): string {
    return `${BASE_API_URL}${path}`;
}