export type UserRole = "admin" | "user";

// public representation of a user, never contains the password hash
export interface PublicUser {
  id: number;
  username: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}
