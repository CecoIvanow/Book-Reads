import { UUIDv4 } from "../../../shared/models/index.js";
import { AccessToken } from "./access-token.model.js";

export type AuthResponse = {
    accessToken: AccessToken,
    email: string,
    firstName: string,
    lastName: string,
    username: string,
    _id: UUIDv4,
}
