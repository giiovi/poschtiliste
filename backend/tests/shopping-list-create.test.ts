import request from "supertest";

import {
  createTestContext,
  loginAs,
  type TestContext,
} from "./helpers/test-app";

const bcryptHash = `$2b$12$${"a".repeat(53)}`;

describe("POST /api/lists", () => {
  let context: TestContext;
  let aliceId: number;
  let bobId: number;
  let cookies: string[];

  beforeEach(async () => {
    context = await createTestContext();
    const { connection } = context;

    [aliceId] = await connection("users").insert({
      username: "alice",
      password_hash: bcryptHash,
      role: "user",
    });
    [bobId] = await connection("users").insert({
      username: "bob",
      password_hash: bcryptHash,
      role: "user",
    });
    cookies = await loginAs(context.app, aliceId);
  });

  afterEach(async () => {
    await context.connection.destroy();
  });

  test("returns 401 for unauthenticated requests", async () => {
    const response = await request(context.app)
      .post("/api/lists")
      .send({ title: "Wocheneinkauf" });

    expect(response.status).toBe(401);
  });

  test("creates a list with assignments and returns 201", async () => {
    const response = await request(context.app)
      .post("/api/lists")
      .set("Cookie", cookies)
      .send({
        title: "Wocheneinkauf",
        dueDate: "2026-09-12",
        responsibleUserId: bobId,
        assignedUserIds: [aliceId, bobId],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: "Wocheneinkauf",
      due_date: "2026-09-12",
      responsible_user_id: bobId,
      completed: false,
      assigned_user_ids: [aliceId, bobId],
    });
    expect(response.body.id).toEqual(expect.any(Number));

    const assignments = await context
      .connection("list_assignments")
      .where("shopping_list_id", response.body.id)
      .orderBy("user_id");
    expect(assignments.map((row) => row.user_id)).toEqual([aliceId, bobId]);
  });

  test("defaults the responsible user to the current user", async () => {
    const response = await request(context.app)
      .post("/api/lists")
      .set("Cookie", cookies)
      .send({ title: "Grillabend" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      responsible_user_id: aliceId,
      due_date: null,
      assigned_user_ids: [],
    });
  });

  test("rejects invalid input with 400 and a readable message", async () => {
    const response = await request(context.app)
      .post("/api/lists")
      .set("Cookie", cookies)
      .send({ title: "", dueDate: "2026-09-12" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Title is required" });
    await expect(
      context.connection("shopping_lists").count({ count: "*" }),
    ).resolves.toEqual([{ count: 0 }]);
  });

  test("rejects an invalid due date with 400", async () => {
    const response = await request(context.app)
      .post("/api/lists")
      .set("Cookie", cookies)
      .send({ title: "Liste", dueDate: "2026-13-01" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Due date is not a valid calendar date");
  });

  test("rejects unknown users and persists nothing", async () => {
    const response = await request(context.app)
      .post("/api/lists")
      .set("Cookie", cookies)
      .send({
        title: "Liste",
        responsibleUserId: 9999,
        assignedUserIds: [aliceId, 8888],
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Unknown user id(s): 8888, 9999" });
    await expect(
      context.connection("shopping_lists").count({ count: "*" }),
    ).resolves.toEqual([{ count: 0 }]);
    await expect(
      context.connection("list_assignments").count({ count: "*" }),
    ).resolves.toEqual([{ count: 0 }]);
  });
});
