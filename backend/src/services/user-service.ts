import type { Database } from "../db/database";
import type { PublicUser } from "../types/user";

export type UserOption = Pick<PublicUser, "id" | "username">;

export interface UserService {
  findById(id: number): Promise<PublicUser | null>;
  listOptions(): Promise<UserOption[]>;
}

export function createUserService(database: Database): UserService {
  return {
    async listOptions(): Promise<UserOption[]> {
      return database.all<UserOption>(
        "SELECT id, username FROM users ORDER BY username",
      );
    },

    async findById(id: number): Promise<PublicUser | null> {
      const rows = await database.all<PublicUser>(
        "SELECT id, username, role, created_at, updated_at FROM users WHERE id = ?",
        [id],
      );

      return rows[0] ?? null;
    },
  };
}
