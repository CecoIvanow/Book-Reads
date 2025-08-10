import { UUIDv4 } from "../../../shared/models/index.js";
import { Owner } from "./owner.model.js";

export interface Like {
    _id: UUIDv4,
    _ownerID: UUIDv4,
    bookId: UUIDv4,
    _createdOn: string,
    owner?: Owner
}