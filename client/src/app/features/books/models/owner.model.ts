import { UUIDv4 } from "../../../shared/models/index.js"

export type Owner = {
    email: string,
    firstName: string,
    lastName: string,
    _id: UUIDv4
    username?: string,
}