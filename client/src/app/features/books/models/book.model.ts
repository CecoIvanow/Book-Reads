import { UUIDv4 } from "../../../shared/models/index.js"
import { Owner } from "./owner.model.js"

export interface Book {
    _ownerId: UUIDv4,
    title: string,
    author: string,
    img: string,
    createdOn: string,
    _id: UUIDv4,
    summary: string,
    owner?: Owner
}