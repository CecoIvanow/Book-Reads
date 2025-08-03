import { UUIDv4 } from "../../../shared/models/uuid.model.js";
import { AccessToken } from "./access-token.model.js";

export interface UserSessionData {
    token: AccessToken,
    id: UUIDv4,
    firstName: string,
    lastName: string,
    email: string,
    username: string,
}