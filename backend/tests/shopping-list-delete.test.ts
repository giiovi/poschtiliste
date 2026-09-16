import request from "supertest";

import {
  createTestContext,
  loginAs,
  type TestContext,
} from "./helpers/test-app";

const bcryptHash = `$2b$12$${"a".repeat(53)}`;

describe("DELETE /api/lists/:id", () => {
  let context: TestContext;
  let adminId: number;
  let aliceId: number;
  let bobId: number;
  let carolId: number;
  let listId: number;
  let otherListId: number;

  async function deleteAs(userId: number, id: number) {
    return request(context.app)
      .delete(`/api/lists/${id}`)
      .set("Cookie", await loginAs(context.app, userId));
  }

  async function count(table: string, listId?: number): Promise<number> {
    const query = context.connection(table).count({ count: "*" });
    if (listId !== undefined) {
      query.where("shopping_list_id", listId);
    }
    const [row] = await query;
    return Number(row.count);
  }

  beforeEach(async () => {
    context = await createTestContext();
    const { connection } = context;
    const insertUser = async (username: string, role: string) => {
      const [id] = await connection("users").insert({
        username,
        password_hash: bcryptHash,
        role,
      });
      return id;
    };

    adminId = await insertUser("admin", "admin");
    aliceId = await insertUser("alice", "user");
    bobId = await insertUser("bob", "user");
    carolId = await insertUser("carol", "user");
    [listId] = await connection("shopping_lists").insert({
      title: "Wocheneinkauf",
      responsible_user_id: aliceId,
    });
    [otherListId] = await connection("shopping_lists").insert({
      title: "Andere Liste",
      responsible_user_id: carolId,
    });
    await connection("list_assignments").insert([
      { shopping_list_id: listId, user_id: bobId },
      { shopping_list_id: otherListId, user_id: carolId },
    ]);
    await connection("shopping_items").insert([
      { shopping_list_id: listId, name: "Milch" },
      { shopping_list_id: listId, name: "Brot" },
      { shopping_list_id: otherListId, name: "Kaffee" },
    ]);
  });

  afterEach(async () => {
    await context.connection.destroy();
  });

  test("returns 401 without a session", async () => {
    const response = await request(context.app).delete(`/api/lists/${listId}`);

    expect(response.status).toBe(401);
  });

  test("deletes the list with items and assignments and keeps other lists", async () => {
    const response = await deleteAs(bobId, listId);

    expect(response.status).toBe(204);
    expect(await count("shopping_lists")).toBe(1);
    expect(await count("shopping_items", listId)).toBe(0);
    expect(await count("list_assignments", listId)).toBe(0);
    expect(await count("shopping_items", otherListId)).toBe(1);
    expect(await count("list_assignments", otherListId)).toBe(1);
  });

  test("lets the responsible user and admins delete", async () => {
    expect((await deleteAs(aliceId, listId)).status).toBe(204);
    expect((await deleteAs(adminId, otherListId)).status).toBe(204);
    expect(await count("shopping_lists")).toBe(0);
    expect(await count("shopping_items")).toBe(0);
    expect(await count("list_assignments")).toBe(0);
  });

  test("rejects users without access with 403 and deletes nothing", async () => {
    const response = await deleteAs(carolId, listId);

    expect(response.status).toBe(403);
    expect(await count("shopping_lists")).toBe(2);
    expect(await count("shopping_items", listId)).toBe(2);
  });

  test("returns 404 for unknown lists and 400 for invalid ids", async () => {
    expect((await deleteAs(adminId, 9999)).status).toBe(404);

    const response = await request(context.app)
      .delete("/api/lists/abc")
      .set("Cookie", await loginAs(context.app, adminId));
    expect(response.status).toBe(400);
  });
});
