import type { Database } from "../db/database";
import type { PublicUser } from "../types/user";

export interface UserService {
  findById(id: number): Promise<PublicUser | null>;
}

export function createUserService(database: Database): UserService {
  return {
    async findById(id: number): Promise<PublicUser | null> {
      const rows = await database.all<PublicUser>(
        "SELECT id, username, role, created_at, updated_at FROM users WHERE id = ?",
        [id],
      );

      return rows[0] ?? null;
    },
  };
}
