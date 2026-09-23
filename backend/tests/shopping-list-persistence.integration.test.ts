import request from "supertest";

import {
  createTestContext,
  loginAs,
  type TestContext,
} from "./helpers/test-app";

const bcryptHash = `$2b$12$${"a".repeat(53)}`;

describe("shopping-list persistence", () => {
  let context: TestContext;
  let userId: number;

  beforeEach(async () => {
    context = await createTestContext();
    [userId] = await context.connection("users").insert({
      username: "integration-user",
      password_hash: bcryptHash,
      role: "user",
    });
  });

  afterEach(async () => {
    await context.connection.destroy();
  });

  test("stores data sent through the HTTP API in the real test database", async () => {
    const cookies = await loginAs(context.app, userId);
    const frontendPayload = {
      title: "Einkauf fürs Wochenende",
      dueDate: "2026-09-26",
    };

    const response = await request(context.app)
      .post("/api/lists")
      .set("Cookie", cookies)
      .send(frontendPayload);

    expect(response.status).toBe(201);

    const storedList = await context
      .connection("shopping_lists")
      .where({ id: response.body.id })
      .first();

    expect(storedList).toMatchObject({
      title: frontendPayload.title,
      due_date: frontendPayload.dueDate,
      responsible_user_id: userId,
      completed: 0,
    });
  });
});
