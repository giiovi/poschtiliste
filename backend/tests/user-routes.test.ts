import request from "supertest";

import {
  createTestContext,
  loginAs,
  type TestContext,
} from "./helpers/test-app";

const bcryptHash = `$2b$12$${"a".repeat(53)}`;

describe("GET /api/users", () => {
  let context: TestContext;
  let aliceId: number;
  let bobId: number;

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

    bobId = await insertUser("bob", "user");
    aliceId = await insertUser("alice", "user");
  });

  afterEach(async () => {
    await context.connection.destroy();
  });

  test("returns 401 without a session", async () => {
    const response = await request(context.app).get("/api/users");

    expect(response.status).toBe(401);
  });

  test("returns id and username only, sorted by username", async () => {
    const response = await request(context.app)
      .get("/api/users")
      .set("Cookie", await loginAs(context.app, bobId));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: aliceId, username: "alice" },
      { id: bobId, username: "bob" },
    ]);
  });
});
