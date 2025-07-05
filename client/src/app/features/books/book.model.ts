import { UUIDv4 } from "../../shared/models/index.js"

export interface Book {
    _ownerId: UUIDv4,
    title: string,
    author: string,
    img: string,
    createdOn: string,
    _id: UUIDv4,
    likes: UUIDv4[],
    comments: UUIDv4[],
    summary: string
}