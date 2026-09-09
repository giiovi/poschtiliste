import request from "supertest";

import {
  createTestContext,
  loginAs,
  type TestContext,
} from "./helpers/test-app";

const bcryptHash = `$2b$12$${"a".repeat(53)}`;

describe("PATCH /api/lists/:id", () => {
  let context: TestContext;
  let adminId: number;
  let aliceId: number;
  let bobId: number;
  let carolId: number;
  let listId: number;

  async function patchAs(userId: number, id: number, body: object) {
    return request(context.app)
      .patch(`/api/lists/${id}`)
      .set("Cookie", await loginAs(context.app, userId))
      .send(body);
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
    await connection("list_assignments").insert({
      shopping_list_id: listId,
      user_id: bobId,
    });
  });

  afterEach(async () => {
    await context.connection.destroy();
  });

  test("returns 401 without a session", async () => {
    const response = await request(context.app)
      .patch(`/api/lists/${listId}`)
      .send({ completed: true });

    expect(response.status).toBe(401);
  });

  test("lets an assigned user edit title, date, responsible user and status", async () => {
    const response = await patchAs(bobId, listId, {
      title: "Grillabend",
      dueDate: "2026-09-19",
      responsibleUserId: bobId,
      completed: true,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: listId,
      title: "Grillabend",
      due_date: "2026-09-19",
      responsible_user_id: bobId,
      completed: true,
    });
  });

  test("lets the responsible user and admins edit", async () => {
    expect((await patchAs(aliceId, listId, { completed: true })).status).toBe(
      200,
    );
    expect((await patchAs(adminId, listId, { completed: false })).status).toBe(
      200,
    );
  });

  test("supports PUT as alias", async () => {
    const response = await request(context.app)
      .put(`/api/lists/${listId}`)
      .set("Cookie", await loginAs(context.app, aliceId))
      .send({ title: "Neu" });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Neu");
  });

  test("rejects users without access with 403 and changes nothing", async () => {
    const response = await patchAs(carolId, listId, { completed: true });

    expect(response.status).toBe(403);
    const [row] = await context
      .connection("shopping_lists")
      .where("id", listId);
    expect(Boolean(row.completed)).toBe(false);
  });

  test("returns 404 for unknown lists", async () => {
    const response = await patchAs(adminId, 9999, { completed: true });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Shopping list not found" });
  });

  test("returns 400 for invalid ids and bodies", async () => {
    expect((await patchAs(aliceId, listId, {})).status).toBe(400);
    expect((await patchAs(aliceId, listId, { completed: "yes" })).status).toBe(
      400,
    );
    expect(
      (await patchAs(aliceId, listId, { responsibleUserId: 9999 })).body,
    ).toEqual({ error: "Unknown user id(s): 9999" });

    const response = await request(context.app)
      .patch("/api/lists/abc")
      .set("Cookie", await loginAs(context.app, aliceId))
      .send({ completed: true });
    expect(response.status).toBe(400);
  });
});
