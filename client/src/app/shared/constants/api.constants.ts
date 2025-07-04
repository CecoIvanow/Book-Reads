export const BASE_API_URL = 'http://localhost:3030';

const API_ROOTS = {
    BOOKS: '/books',
    USERS: '/users'
}

export const API_PATHS = {
    BOOKS: {
        ROOT: API_ROOTS.BOOKS,
    },
    USERS: {
        ROOT: API_ROOTS.USERS,
        LOGIN: `${API_ROOTS.USERS}/login`,
        REGISTER: `${API_ROOTS.USERS}/register`,
    },
}