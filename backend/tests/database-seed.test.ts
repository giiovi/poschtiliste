import path from "node:path";

import bcrypt from "bcryptjs";
import knex, { type Knex } from "knex";

import { seedLists, seedUsers } from "../src/db/seeds/001_development_data";

const migrationsDirectory = path.resolve(__dirname, "../src/db/migrations");
const seedsDirectory = path.resolve(__dirname, "../src/db/seeds");

async function countRows(database: Knex, table: string): Promise<number> {
  const [row] = await database(table).count({ count: "*" });

  return Number(row.count);
}

describe("development seed", () => {
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
      seeds: {
        directory: seedsDirectory,
        loadExtensions: [".ts"],
      },
    });
    // foreign keys stay off on purpose: the seed must not rely on cascading deletes
    await database.migrate.latest();
  });

  afterEach(async () => {
    await database.destroy();
  });

  test("creates an admin and a normal user with bcrypt hashes", async () => {
    await database.seed.run();

    const users: { username: string; password_hash: string; role: string }[] =
      await database("users").select("username", "password_hash", "role");
    const roles = users.map((user) => user.role);

    expect(roles).toContain("admin");
    expect(roles).toContain("user");

    for (const seedUser of seedUsers) {
      const user = users.find((row) => row.username === seedUser.username);

      expect(user).toBeDefined();
      expect(user?.password_hash).not.toBe(seedUser.password);
      await expect(
        bcrypt.compare(seedUser.password, user?.password_hash ?? ""),
      ).resolves.toBe(true);
    }
  });

  test("creates example lists with items and assignments", async () => {
    await database.seed.run();

    let expectedItems = 0;
    let expectedAssignments = 0;
    for (const list of seedLists) {
      expectedItems += list.items.length;
      expectedAssignments += list.assignedUsernames.length;
    }

    await expect(countRows(database, "shopping_lists")).resolves.toBe(
      seedLists.length,
    );
    await expect(countRows(database, "shopping_items")).resolves.toBe(
      expectedItems,
    );
    await expect(countRows(database, "list_assignments")).resolves.toBe(
      expectedAssignments,
    );
  });

  test("can run multiple times without errors or duplicates", async () => {
    await database.seed.run();
    const firstRun = await database("users").select("id", "username");

    await database.seed.run();
    const secondRun = await database("users").select("id", "username");

    expect(secondRun).toEqual(firstRun);
    await expect(countRows(database, "users")).resolves.toBe(seedUsers.length);
    await expect(countRows(database, "shopping_lists")).resolves.toBe(
      seedLists.length,
    );

    let expectedItems = 0;
    let expectedAssignments = 0;
    for (const list of seedLists) {
      expectedItems += list.items.length;
      expectedAssignments += list.assignedUsernames.length;
    }

    await expect(countRows(database, "shopping_items")).resolves.toBe(
      expectedItems,
    );
    await expect(countRows(database, "list_assignments")).resolves.toBe(
      expectedAssignments,
    );
  });
});
