import { UUIDv4 } from "../models/index.js"

type BookPaths = {
    ROOT: string,
    COUNT: string,
    DETAILS: (id: UUIDv4) => string,
    PAGINATION: (skip: number, size: number) => string,
    'DETAILS-W-OWNER': (id: UUIDv4) => string,
}

type UserPaths = {
    ROOT: string,
    LOGIN: string,
    REGISTER: string,
}

export type ApiRoots = {
    BOOKS: string,
    USERS: string,
}

export type ApiPaths = {
    BOOKS: BookPaths,
    USERS: UserPaths,
}