import { UUIDv4 } from "../../../shared/models/index.js";

export type AuthResponse = {
    accessToken: string,
    email: string,
    firstName: string,
    lastName: string,
    username: string,
    _id: UUIDv4,
}
