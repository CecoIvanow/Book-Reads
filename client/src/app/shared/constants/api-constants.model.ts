type BookPaths = {
    ROOT: string,
    PAGINATION: (skip: number, size: number) => string,
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