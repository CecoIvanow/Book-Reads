import { UUIDv4 } from "../../../../../shared/models/index.js"

export type Comment = {
    _ownerId: UUIDv4,
    bookId: UUIDv4,
    content: string,
    _id: UUIDv4
}