import request from "supertest";

import {
  createTestContext,
  loginAs,
  type TestContext,
} from "./helpers/test-app";

const bcryptHash = `$2b$12$${"a".repeat(53)}`;

describe("GET /api/lists/:id", () => {
  let context: TestContext;
  let adminId: number;
  let aliceId: number;
  let bobId: number;
  let carolId: number;
  let listId: number;

  async function getAs(userId: number, id: number | string) {
    return request(context.app)
      .get(`/api/lists/${id}`)
      .set("Cookie", await loginAs(context.app, userId));
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
      due_date: "2026-11-02",
      responsible_user_id: aliceId,
    });
    await connection("list_assignments").insert({
      shopping_list_id: listId,
      user_id: bobId,
    });
  });

  afterEach(async () => {
    await context.connection.destroy();
  });

  test("returns 401 without a session", async () => {
    const response = await request(context.app).get(`/api/lists/${listId}`);

    expect(response.status).toBe(401);
  });

  test("returns the list with its assigned user ids", async () => {
    const response = await getAs(bobId, listId);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: listId,
      title: "Wocheneinkauf",
      due_date: "2026-11-02",
      responsible_user_id: aliceId,
      completed: false,
      assigned_user_ids: [bobId],
    });
  });

  test("lets the responsible user and admins read the list", async () => {
    expect((await getAs(aliceId, listId)).status).toBe(200);
    expect((await getAs(adminId, listId)).status).toBe(200);
  });

  test("rejects users without access with 403", async () => {
    expect((await getAs(carolId, listId)).status).toBe(403);
  });

  test("returns 404 for unknown lists and 400 for invalid ids", async () => {
    expect((await getAs(adminId, 9999)).status).toBe(404);
    expect((await getAs(adminId, "abc")).status).toBe(400);
  });
});
