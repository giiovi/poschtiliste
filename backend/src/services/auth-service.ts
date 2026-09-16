import bcrypt from "bcrypt";

import type { Database } from "../db/database";
import type { AuthenticatedUser } from "../types/auth";

// Comparing against a real hash also keeps an unknown username from revealing
// itself through a noticeably faster request.
const UNKNOWN_USER_HASH =
  "$2b$12$bDXfOxqFUCsHAa5HiZFou.DW9DwVwZZXLynqk2L/geHahmQbJOXpC";

interface UserRecord extends AuthenticatedUser {
  passwordHash: string;
}

export interface AuthService {
  authenticate(
    username: string,
    password: string,
  ): Promise<AuthenticatedUser | null>;
}

export function createAuthService(database: Database): AuthService {
  return {
    async authenticate(username, password) {
      const users = await database.all<UserRecord>(
        `SELECT id, username, password_hash AS passwordHash, role
         FROM users
         WHERE username = ?
         LIMIT 1`,
        [username],
      );
      const user = users[0];
      const passwordMatches = await bcrypt.compare(
        password,
        user?.passwordHash ?? UNKNOWN_USER_HASH,
      );

      if (!user || !passwordMatches) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        role: user.role,
      };
    },
  };
}
