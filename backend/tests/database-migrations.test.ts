import path from "node:path";

import knex, { type Knex } from "knex";

const migrationsDirectory = path.resolve(__dirname, "../src/db/migrations");
const bcryptHash = `$2b$12$${"a".repeat(53)}`;

describe("initial database migrations", () => {
  let database: Knex;

  beforeEach(async () => {
    database = knex({
      client: "sqlite3",
      connection: { filename: ":memory:" },
      useNullAsDefault: true,
      pool: { min: 1, max: 1 },
      migrations: {
        directory: migrationsDirectory,
        loadExtensions: [".ts"],
      },
    });
    await database.raw("PRAGMA foreign_keys = ON");
  });

  afterEach(async () => {
    await database.destroy();
  });

  test("creates all tables and required columns", async () => {
    await database.migrate.latest();

    await expect(database.schema.hasTable("users")).resolves.toBe(true);
    await expect(database.schema.hasTable("shopping_lists")).resolves.toBe(
      true,
    );
    await expect(database.schema.hasTable("shopping_items")).resolves.toBe(
      true,
    );
    await expect(database.schema.hasTable("list_assignments")).resolves.toBe(
      true,
    );

    const userColumns = await database("users").columnInfo();
    expect(userColumns).toHaveProperty("password_hash");
    expect(userColumns).not.toHaveProperty("password");
  });

  test("enforces bcrypt hashes, unique usernames and valid roles", async () => {
    await database.migrate.latest();

    await database("users").insert({
      username: "alice",
      password_hash: bcryptHash,
      role: "admin",
    });

    await expect(
      database("users").insert({
        username: "alice",
        password_hash: bcryptHash,
        role: "user",
      }),
    ).rejects.toThrow();
    await expect(
      database("users").insert({
        username: "bob",
        password_hash: "plain-text-password",
        role: "user",
      }),
    ).rejects.toThrow();
    await expect(
      database("users").insert({
        username: "carol",
        password_hash: bcryptHash,
        role: "superuser",
      }),
    ).rejects.toThrow();
  });

  test("enforces relationships, required fields and assignment uniqueness", async () => {
    await database.migrate.latest();

    const [userId] = await database("users").insert({
      username: "alice",
      password_hash: bcryptHash,
      role: "user",
    });
    const [listId] = await database("shopping_lists").insert({
      title: "Weekend shopping",
      responsible_user_id: userId,
    });

    await database("shopping_items").insert({
      shopping_list_id: listId,
      name: "Milk",
      quantity: 1,
    });
    await database("list_assignments").insert({
      shopping_list_id: listId,
      user_id: userId,
    });

    await expect(
      database("list_assignments").insert({
        shopping_list_id: listId,
        user_id: userId,
      }),
    ).rejects.toThrow();
    await expect(
      database("shopping_items").insert({
        shopping_list_id: listId,
        name: "Invalid quantity",
        quantity: 0,
      }),
    ).rejects.toThrow();
    await expect(
      database("shopping_lists").insert({
        title: "Unknown responsible user",
        responsible_user_id: 9999,
      }),
    ).rejects.toThrow();
    await expect(
      database("shopping_lists").insert({
        responsible_user_id: userId,
      }),
    ).rejects.toThrow();
  });

  test("rolls the complete schema back in reverse order", async () => {
    await database.migrate.latest();
    await database.migrate.rollback(undefined, true);

    await expect(database.schema.hasTable("list_assignments")).resolves.toBe(
      false,
    );
    await expect(database.schema.hasTable("shopping_items")).resolves.toBe(
      false,
    );
    await expect(database.schema.hasTable("shopping_lists")).resolves.toBe(
      false,
    );
    await expect(database.schema.hasTable("users")).resolves.toBe(false);
  });
});
