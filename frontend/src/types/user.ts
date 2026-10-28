export type UserRole = "admin" | "user";

export interface User {
  id: number;
  username: string;
  role: UserRole;
}

export type UserOption = Pick<User, "id" | "username">;

export interface AdminUser extends User {
  created_at: string;
  updated_at: string;
}
