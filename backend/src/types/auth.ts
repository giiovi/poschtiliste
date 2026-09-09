import type { PublicUser } from "./user";

export type AuthenticatedUser = Pick<PublicUser, "id" | "username" | "role">;
