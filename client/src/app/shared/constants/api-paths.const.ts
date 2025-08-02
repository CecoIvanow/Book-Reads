import { UUIDv4 } from "../models/uuid.model.js";
import { ApiPaths, ApiRoots } from "./api-paths.model.js";

export const BASE_API_URL = 'http://localhost:3030';

const API_ROOTS: ApiRoots = {
    COMMENTS: '/data/comments',
    BOOKS: '/data/books',
    USERS: '/users',
    LIKES: '/data/likes',
}

export const API_PATHS: ApiPaths = {
    BOOKS: {
        ROOT: API_ROOTS.BOOKS,
        COUNT: `${API_ROOTS.BOOKS}?count=true`,
        PAGINATION: (skip: number, size: number) => `${API_ROOTS.BOOKS}?offset=${skip}&pageSize=${size}`,
        DETAILS: {
            ROOT: (id: UUIDv4) => `${API_ROOTS.BOOKS}/${id}`,
            WITH_OWNER: (id: UUIDv4) => `${API_ROOTS.BOOKS}/${id}?load=${encodeURIComponent('owner=_ownerId:users')}`,
            COMMENTS: (bookId: UUIDv4) => `${API_ROOTS.COMMENTS}?where=${encodeURIComponent(`bookId="${bookId}"`)}&load=${encodeURIComponent(`owner=_ownerId:users`)}`,
        },
    },  
    USERS: {
        ROOT: API_ROOTS.USERS,
        LOGIN: `${API_ROOTS.USERS}/login`,
        REGISTER: `${API_ROOTS.USERS}/register`,
        LOGOUT: `${API_ROOTS.USERS}/logout`
    },
    LIKES: {
        ROOT: `${API_ROOTS.LIKES}`,
        OF_BOOK: {
            COUNT: (bookId: UUIDv4) => `${API_ROOTS.LIKES}?where=bookId${encodeURIComponent(`="${bookId}"`)}&count=true`,
            FROM_OWNER: (bookId: UUIDv4, ownerId: UUIDv4) => `${API_ROOTS.LIKES}?where=${encodeURIComponent(`bookId="${bookId}" AND _ownerId="${ownerId}"`)}`,
        }
    }
}