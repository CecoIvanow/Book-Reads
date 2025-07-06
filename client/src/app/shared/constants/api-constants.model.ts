import { UUIDv4 } from "../models/index.js"

export type ApiRoots = {
    BOOKS: string,
    USERS: string,
    COMMENTS: string,
}

type BookDetails = {
    ROOT: (id: UUIDv4) => string,
    WITH_OWNER: (id: UUIDv4) => string,
}

type CommentsPath = {
    OF_BOOK: {
        // ROOT: (bookId: UUIDv4) => string,
        ONLY_OWNERID: (bookId: UUIDv4) => string,
    }
}

type BookPaths = {
    ROOT: string,
    COUNT: string,
    DETAILS: BookDetails,
        PAGINATION: (skip: number, size: number) => string,
}

type UserPaths = {
    ROOT: string,
    LOGIN: string,
    REGISTER: string,
}

export type ApiPaths = {
    BOOKS: BookPaths,
    USERS: UserPaths,
    COMMENTS: CommentsPath,
}