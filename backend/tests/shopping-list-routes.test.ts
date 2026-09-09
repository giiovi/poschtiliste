import request from "supertest";

import {
  createTestContext,
  loginAs,
  type TestContext,
} from "./helpers/test-app";

const bcryptHash = `$2b$12$${"a".repeat(53)}`;

describe("GET /api/lists", () => {
  let context: TestContext;
  let adminId: number;
  let aliceId: number;
  let bobId: number;
  let carolId: number;

  beforeEach(async () => {
    context = await createTestContext();
    const { connection } = context;

    [adminId] = await connection("users").insert({
      username: "admin",
      password_hash: bcryptHash,
      role: "admin",
    });
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
    [carolId] = await connection("users").insert({
      username: "carol",
      password_hash: bcryptHash,
      role: "user",
    });

    const [aliceListId] = await connection("shopping_lists").insert({
      title: "Alice list",
      responsible_user_id: aliceId,
    });
    const [sharedListId] = await connection("shopping_lists").insert({
      title: "Shared list",
      responsible_user_id: bobId,
      completed: true,
    });
    await connection("shopping_lists").insert({
      title: "Bob only list",
      responsible_user_id: bobId,
    });

    await connection("list_assignments").insert([
      { shopping_list_id: aliceListId, user_id: aliceId },
      { shopping_list_id: sharedListId, user_id: aliceId },
      { shopping_list_id: sharedListId, user_id: bobId },
    ]);
  });

  afterEach(async () => {
    await context.connection.destroy();
  });

  test("returns 401 for unauthenticated requests", async () => {
    const response = await request(context.app).get("/api/lists");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
  });

  test("returns only assigned or responsible lists for normal users", async () => {
    const cookies = await loginAs(context.app, aliceId);

    const response = await request(context.app)
      .get("/api/lists")
      .set("Cookie", cookies);

    expect(response.status).toBe(200);
    expect(response.body.map((list: { title: string }) => list.title)).toEqual([
      "Alice list",
      "Shared list",
    ]);
    expect(response.body[1]).toMatchObject({
      responsible_user_id: bobId,
      completed: true,
      due_date: null,
    });
  });

  test("returns an empty array for users without lists", async () => {
    const cookies = await loginAs(context.app, carolId);

    const response = await request(context.app)
      .get("/api/lists")
      .set("Cookie", cookies);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("returns all lists for admins", async () => {
    const cookies = await loginAs(context.app, adminId);

    const response = await request(context.app)
      .get("/api/lists")
      .set("Cookie", cookies);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body.map((list: { title: string }) => list.title)).toEqual([
      "Alice list",
      "Shared list",
      "Bob only list",
    ]);
  });
});
