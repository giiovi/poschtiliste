import bcrypt from "bcryptjs";
import type { Knex } from "knex";

interface SeedUser {
  username: string;
  password: string;
  role: "admin" | "user";
}

interface SeedItem {
  name: string;
  quantity: number;
  purchased: boolean;
}

interface SeedList {
  title: string;
  dueDate: string | null;
  responsibleUsername: string;
  assignedUsernames: string[];
  completed: boolean;
  items: SeedItem[];
}

const BCRYPT_ROUNDS = 10;

export const seedUsers: SeedUser[] = [
  { username: "admin", password: "admin1234", role: "admin" },
  { username: "alice", password: "alice1234", role: "user" },
  { username: "bob", password: "bob12345", role: "user" },
];

export const seedLists: SeedList[] = [
  {
    title: "Wocheneinkauf",
    dueDate: "2026-09-12",
    responsibleUsername: "alice",
    assignedUsernames: ["alice", "bob"],
    completed: false,
    items: [
      { name: "Milch", quantity: 2, purchased: true },
      { name: "Brot", quantity: 1, purchased: false },
      { name: "Äpfel", quantity: 6, purchased: false },
    ],
  },
  {
    title: "Grillabend",
    dueDate: "2026-09-19",
    responsibleUsername: "bob",
    assignedUsernames: ["bob", "admin"],
    completed: false,
    items: [
      { name: "Würste", quantity: 10, purchased: false },
      { name: "Holzkohle", quantity: 1, purchased: false },
    ],
  },
  {
    title: "Büromaterial",
    dueDate: null,
    responsibleUsername: "admin",
    assignedUsernames: ["admin"],
    completed: true,
    items: [{ name: "Druckerpapier", quantity: 5, purchased: true }],
  },
];

async function upsertUsers(knex: Knex): Promise<Map<string, number>> {
  for (const user of seedUsers) {
    const passwordHash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);

    await knex("users")
      .insert({
        username: user.username,
        password_hash: passwordHash,
        role: user.role,
        updated_at: knex.fn.now(),
      })
      .onConflict("username")
      .merge(["password_hash", "role", "updated_at"]);
  }

  const rows: { id: number; username: string }[] = await knex("users")
    .select("id", "username")
    .whereIn(
      "username",
      seedUsers.map((user) => user.username),
    );

  return new Map(rows.map((row) => [row.username, row.id]));
}

async function replaceLists(
  knex: Knex,
  userIds: Map<string, number>,
): Promise<void> {
  // delete dependent rows explicitly because sqlite only cascades with foreign keys enabled
  const seedListIds = knex("shopping_lists")
    .select("id")
    .whereIn("responsible_user_id", [...userIds.values()]);

  await knex("shopping_items")
    .whereIn("shopping_list_id", seedListIds)
    .delete();
  await knex("list_assignments")
    .whereIn("shopping_list_id", seedListIds)
    .delete();
  await knex("shopping_lists")
    .whereIn("responsible_user_id", [...userIds.values()])
    .delete();

  for (const list of seedLists) {
    const [listId] = await knex("shopping_lists").insert({
      title: list.title,
      due_date: list.dueDate,
      responsible_user_id: userIds.get(list.responsibleUsername),
      completed: list.completed,
    });

    await knex("shopping_items").insert(
      list.items.map((item) => ({
        shopping_list_id: listId,
        name: item.name,
        quantity: item.quantity,
        purchased: item.purchased,
      })),
    );

    await knex("list_assignments").insert(
      list.assignedUsernames.map((username) => ({
        shopping_list_id: listId,
        user_id: userIds.get(username),
      })),
    );
  }
}

export async function seed(knex: Knex): Promise<void> {
  await knex.transaction(async (transaction) => {
    const userIds = await upsertUsers(transaction);
    await replaceLists(transaction, userIds);
  });
}
