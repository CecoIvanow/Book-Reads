import { UUIDv4 } from "../models/index.js"

export type ApiRoots = {
    BOOKS: string,
    AUTH: string,
    COMMENTS: string,
    LIKES: string
}

type CommentPaths = {
    ROOT: string,
    SPECIFIC: {
        ROOT: (commentId: UUIDv4) => string,
    },
    ALL: {
        FROM_OWNER: (userId: UUIDv4) => string,
    }
}

type BooksPaths = {
    ROOT: string,
    COUNT: string,
    DETAILS: {
        ROOT: (id: UUIDv4) => string,
        WITH_OWNER: (id: UUIDv4) => string,
        COMMENTS: (bookId: UUIDv4) => string,
    },
    ALL: {
        FROM_OWNER: (userId: UUIDv4) => string,
    }
    PAGINATION: (skip: number, size: number) => string,
}

type AuthPaths = {
    LOGIN: string,
    REGISTER: string,
    LOGOUT: string,
    DETAILS: {
        ROOT: (userId: UUIDv4) => string
    }
}

type LikesPaths = {
    ROOT: string,
    OF_BOOK: {
        COUNT: (bookId: UUIDv4) => string,
        FROM_OWNER: (bookId: UUIDv4, ownerId: UUIDv4) => string,
    },
    DETAILS: {
        ROOT: (likeId: UUIDv4) => string,
    }
}

export type ApiPaths = {
    BOOKS: BooksPaths,
    AUTH: AuthPaths,
    LIKES: LikesPaths,
    COMMENTS: CommentPaths
}