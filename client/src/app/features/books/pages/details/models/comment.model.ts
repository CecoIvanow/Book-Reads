import { UUIDv4 } from "../../../../../shared/models/index.js"
import { Owner } from "./index.js"

export type Comment = {
    _ownerId: UUIDv4,
    bookId: UUIDv4,
    content: string,
    _id: UUIDv4,
    owner?: Owner
}