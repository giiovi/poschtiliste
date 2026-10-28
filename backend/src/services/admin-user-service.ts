import bcrypt from "bcrypt";
import type { Knex } from "knex";

import type { Database } from "../db/database";
import { ConflictError, NotFoundError } from "../errors/http-error";
import type { PublicUser } from "../types/user";
import type { UserInput, UserUpdate } from "../validation/user-validation";

// same cost as the reference hash in the auth service
const BCRYPT_ROUNDS = 12;
const PUBLIC_USER_COLUMNS = [
  "id",
  "username",
  "role",
  "created_at",
  "updated_at",
];

export interface AdminUserService {
  list(): Promise<PublicUser[]>;
  create(input: UserInput): Promise<PublicUser>;
  update(
    id: number,
    update: UserUpdate,
    currentUser: PublicUser,
  ): Promise<PublicUser>;
  remove(id: number, currentUser: PublicUser): Promise<void>;
  resetPassword(id: number, password: string): Promise<void>;
}

async function assertUserExists(
  transaction: Knex.Transaction,
  id: number,
): Promise<void> {
  const user = await transaction("users").where("id", id).first("id");

  if (!user) {
    throw new NotFoundError("User not found");
  }
}

async function assertUsernameAvailable(
  transaction: Knex.Transaction,
  username: string,
  excludedId?: number,
): Promise<void> {
  const query = transaction("users").where("username", username);

  if (excludedId !== undefined) {
    query.whereNot("id", excludedId);
  }

  if (await query.first("id")) {
    throw new ConflictError("Username is already taken");
  }
}

async function findPublicUser(
  transaction: Knex.Transaction,
  id: number,
): Promise<PublicUser> {
  return transaction("users")
    .select(PUBLIC_USER_COLUMNS)
    .where("id", id)
    .first();
}

export function createAdminUserService(database: Database): AdminUserService {
  return {
    async list(): Promise<PublicUser[]> {
      return database
        .connection("users")
        .select(PUBLIC_USER_COLUMNS)
        .orderBy("username");
    },

    async create(input: UserInput): Promise<PublicUser> {
      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

      return database.connection.transaction(async (transaction) => {
        await assertUsernameAvailable(transaction, input.username);

        const [id] = await transaction("users").insert({
          username: input.username,
          password_hash: passwordHash,
          role: input.role,
        });

        return findPublicUser(transaction, id);
      });
    },

    async update(
      id: number,
      update: UserUpdate,
      currentUser: PublicUser,
    ): Promise<PublicUser> {
      return database.connection.transaction(async (transaction) => {
        await assertUserExists(transaction, id);

        if (id === currentUser.id && update.role === "user") {
          throw new ConflictError(
            "Administrators cannot remove their own admin role",
          );
        }

        if (update.username !== undefined) {
          await assertUsernameAvailable(transaction, update.username, id);
        }

        await transaction("users")
          .where("id", id)
          .update({
            ...(update.username !== undefined && {
              username: update.username,
            }),
            ...(update.role !== undefined && { role: update.role }),
            updated_at: transaction.fn.now(),
          });

        return findPublicUser(transaction, id);
      });
    },

    async remove(id: number, currentUser: PublicUser): Promise<void> {
      await database.connection.transaction(async (transaction) => {
        await assertUserExists(transaction, id);

        if (id === currentUser.id) {
          throw new ConflictError(
            "Administrators cannot delete their own account",
          );
        }

        const responsibleList = await transaction("shopping_lists")
          .where("responsible_user_id", id)
          .first("id");

        if (responsibleList) {
          throw new ConflictError(
            "User is still responsible for shopping lists",
          );
        }

        await transaction("list_assignments").where("user_id", id).delete();
        await transaction("users").where("id", id).delete();
      });
    },

    async resetPassword(id: number, password: string): Promise<void> {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      await database.connection.transaction(async (transaction) => {
        await assertUserExists(transaction, id);
        await transaction("users").where("id", id).update({
          password_hash: passwordHash,
          updated_at: transaction.fn.now(),
        });
      });
    },
  };
}
