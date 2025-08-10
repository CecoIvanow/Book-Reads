import { UUIDv4 } from "../models/uuid.model.js";
import { ApiPaths, ApiRoots } from "./api-paths.model.js";

export const BASE_API_URL = 'http://localhost:3030';

const API_ROOTS: ApiRoots = {
    COMMENTS: '/data/comments',
    BOOKS: '/data/books',
    AUTH: '/users',
    LIKES: '/data/likes',
}

export const API_PATHS: ApiPaths = {
    BOOKS: {
        ROOT: API_ROOTS.BOOKS,
        COUNT: `${API_ROOTS.BOOKS}?count=true`,
        PAGINATION: (skip: number, size: number) => `${API_ROOTS.BOOKS}?sortBy=${encodeURIComponent('_createdOn desc')}&offset=${skip}&pageSize=${size}`,
        DETAILS: {
            ROOT: (id: UUIDv4) => `${API_ROOTS.BOOKS}/${id}`,
            WITH_OWNER: (id: UUIDv4) => `${API_ROOTS.BOOKS}/${id}?load=${encodeURIComponent('owner=_ownerId:users')}`,
            COMMENTS: (bookId: UUIDv4) => `${API_ROOTS.COMMENTS}?where=${encodeURIComponent(`bookId="${bookId}"`)}&load=${encodeURIComponent(`owner=_ownerId:users`)}`,
        },
        ALL: {
            FROM_OWNER: (userId: UUIDv4) => `${API_ROOTS.BOOKS}?where=${encodeURIComponent(`_ownerId="${userId}"`)}&load=${encodeURIComponent(`owner=_ownerId:users`)}`
        }
    },
    AUTH: {
        LOGIN: `${API_ROOTS.AUTH}/login`,
        REGISTER: `${API_ROOTS.AUTH}/register`,
        LOGOUT: `${API_ROOTS.AUTH}/logout`,
        DETAILS: {
            ROOT: (userId) => `${API_ROOTS.AUTH}/${userId}`,
        }

    },
    LIKES: {
        ROOT: `${API_ROOTS.LIKES}`,
        USER_DATA: (userId: UUIDv4) => `${API_ROOTS.LIKES}?where=${encodeURIComponent(`bookId="" AND _ownerId="${userId}"`)}&load=${encodeURIComponent(`owner=_ownerId:users`)}`,
        OF_BOOK: {
            COUNT: (bookId: UUIDv4) => `${API_ROOTS.LIKES}?where=bookId${encodeURIComponent(`="${bookId}"`)}&count=true`,
            FROM_OWNER: (bookId: UUIDv4, ownerId: UUIDv4) => `${API_ROOTS.LIKES}?where=${encodeURIComponent(`bookId="${bookId}" AND _ownerId="${ownerId}"`)}`,
        },
        DETAILS: {
            ROOT: (likeId: UUIDv4) => `${API_ROOTS.LIKES}/${likeId}`,
        }
    },
    COMMENTS: {
        ROOT: `${API_ROOTS.COMMENTS}`,
        SPECIFIC: {
            ROOT: (commentId: UUIDv4) => `${API_ROOTS.COMMENTS}/${commentId}`,
        },
        ALL: {
            FROM_OWNER: (userId: UUIDv4) => `${API_ROOTS.COMMENTS}?where=${encodeURIComponent(`_ownerId="${userId}"`)}&load=${encodeURIComponent(`owner=_ownerId:users,book=bookId:books`)}`
        }
    }
}