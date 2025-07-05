import { UUIDv4 } from "../models/uuid.model.js";
import { ApiPaths, ApiRoots } from "./api-constants.model.js";

export const BASE_API_URL = 'http://localhost:3030';

const API_ROOTS: ApiRoots = {
    BOOKS: '/data/books',
    USERS: '/users'
}

export const API_PATHS: ApiPaths = {
    BOOKS: {
        ROOT: API_ROOTS.BOOKS,
        COUNT: `${API_ROOTS.BOOKS}/?count=true`,
        PAGINATION: (skip: number, size: number) => `${API_ROOTS.BOOKS}?offset=${skip}&pageSize=${size}`,
        DETAILS: (id: UUIDv4) => `${API_ROOTS.BOOKS}/${id}`,
    },  
    USERS: {
        ROOT: API_ROOTS.USERS,
        LOGIN: `${API_ROOTS.USERS}/login`,
        REGISTER: `${API_ROOTS.USERS}/register`,
    },
}