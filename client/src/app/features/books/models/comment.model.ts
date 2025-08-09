import { UUIDv4 } from "../../../shared/models/index.js"
import { Book } from "./book.model.js"
import { Owner } from "./owner.model.js"

export type CommentType = {
    _ownerId: UUIDv4,
    bookId: UUIDv4,
    content: string,
    _id: UUIDv4,
    _createdAt?: Date,
    owner?: Owner,
    book?: Book
}