import { UUIDv4 } from "../models/index.js"

export type ApiRoots = {
    BOOKS: string,
    USERS: string,
    COMMENTS: string,
    LIKES: string
}

type BookDetails = {
    ROOT: (id: UUIDv4) => string,
    WITH_OWNER: (id: UUIDv4) => string,
}

type CommentsPath = {
    WITH_OWNER: (commentId: UUIDv4) => string,
}

type BooksPaths = {
    ROOT: string,
    COUNT: string,
    DETAILS: BookDetails,
        PAGINATION: (skip: number, size: number) => string,
}

type UsersPaths = {
    ROOT: string,
    LOGIN: string,
    REGISTER: string,
    LOGOUT: string
}

type LikesPaths = {
    ROOT: string,
    OF_BOOK: {
        COUNT: (bookId: UUIDv4) => string,
    }
}

export type ApiPaths = {
    BOOKS: BooksPaths,
    USERS: UsersPaths,
    COMMENTS: CommentsPath,
    LIKES: LikesPaths
}