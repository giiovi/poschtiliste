import request from "supertest";

import {
  createTestContext,
  loginAs,
  type TestContext,
} from "./helpers/test-app";

const bcryptHash = `$2b$12$${"a".repeat(53)}`;

describe("list assignments", () => {
  let context: TestContext;
  let adminId: number;
  let aliceId: number;
  let bobId: number;
  let carolId: number;
  let listId: number;

  async function addAs(userId: number, id: number, body: object) {
    return request(context.app)
      .post(`/api/lists/${id}/assignments`)
      .set("Cookie", await loginAs(context.app, userId))
      .send(body);
  }

  async function removeAs(userId: number, id: number, assignedUserId: number) {
    return request(context.app)
      .delete(`/api/lists/${id}/assignments/${assignedUserId}`)
      .set("Cookie", await loginAs(context.app, userId));
  }

  async function assignedUserIds(): Promise<number[]> {
    const rows = await context
      .connection("list_assignments")
      .where("shopping_list_id", listId)
      .orderBy("user_id");
    return rows.map((row) => row.user_id);
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
      .post(`/api/lists/${listId}/assignments`)
      .send({ userId: carolId });

    expect(response.status).toBe(401);
  });

  test("adds a user and returns all assigned user ids", async () => {
    const response = await addAs(aliceId, listId, { userId: carolId });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ assigned_user_ids: [bobId, carolId] });
    expect(await assignedUserIds()).toEqual([bobId, carolId]);
  });

  test("rejects duplicate assignments with 409", async () => {
    const response = await addAs(aliceId, listId, { userId: bobId });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "User is already assigned to this list",
    });
    expect(await assignedUserIds()).toEqual([bobId]);
  });

  test("rejects unknown users and invalid bodies with 400", async () => {
    expect((await addAs(aliceId, listId, { userId: 9999 })).status).toBe(400);
    expect((await addAs(aliceId, listId, {})).status).toBe(400);
    expect((await addAs(aliceId, listId, { userId: "x" })).status).toBe(400);
  });

  test("removes an assignment", async () => {
    const response = await removeAs(bobId, listId, bobId);

    expect(response.status).toBe(204);
    expect(await assignedUserIds()).toEqual([]);
  });

  test("returns 404 for missing assignments or lists", async () => {
    expect((await removeAs(aliceId, listId, carolId)).status).toBe(404);
    expect((await removeAs(adminId, 9999, bobId)).status).toBe(404);
    expect((await addAs(adminId, 9999, { userId: bobId })).status).toBe(404);
  });

  test("rejects users without access with 403", async () => {
    expect((await addAs(carolId, listId, { userId: carolId })).status).toBe(
      403,
    );
    expect((await removeAs(carolId, listId, bobId)).status).toBe(403);
    expect(await assignedUserIds()).toEqual([bobId]);
  });

  test("lets admins manage assignments", async () => {
    expect((await addAs(adminId, listId, { userId: carolId })).status).toBe(
      201,
    );
    expect((await removeAs(adminId, listId, bobId)).status).toBe(204);
    expect(await assignedUserIds()).toEqual([carolId]);
  });
});
