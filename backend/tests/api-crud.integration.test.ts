import request from "supertest";

import {
  createIntegrationDatabase,
  type IntegrationDatabase,
} from "./helpers/integration-database";

describe("api crud against the real test database", () => {
  let integration: IntegrationDatabase;

  beforeAll(async () => {
    integration = await createIntegrationDatabase();
  });

  beforeEach(async () => {
    await integration.reset();
  });

  afterAll(async () => {
    await integration.destroy();
  });

  async function loginAs(username: string, password: string) {
    const agent = request.agent(integration.app);
    const response = await agent
      .post("/api/auth/login")
      .send({ username, password });

    expect(response.status).toBe(200);
    return { agent, user: response.body.user };
  }

  test("auth flow logs a seeded user in and out", async () => {
    const { agent, user } = await loginAs("alice", "alice1234");

    const meResponse = await agent.get("/api/auth/me");
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user).toMatchObject({
      id: user.id,
      username: "alice",
      role: "user",
    });

    expect((await agent.post("/api/auth/logout")).status).toBe(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  test("rejects a wrong password for a seeded user", async () => {
    const response = await request(integration.app)
      .post("/api/auth/login")
      .send({ username: "alice", password: "wrong-password" });

    expect(response.status).toBe(401);
  });

  test("list flow creates, reads, updates and deletes a list", async () => {
    const { agent, user } = await loginAs("alice", "alice1234");

    const createResponse = await agent
      .post("/api/lists")
      .send({ title: "Wochenmarkt", dueDate: "2026-12-05" });
    expect(createResponse.status).toBe(201);
    const listId = createResponse.body.id;

    expect(
      await integration
        .connection("shopping_lists")
        .where({ id: listId })
        .first(),
    ).toMatchObject({
      title: "Wochenmarkt",
      due_date: "2026-12-05",
      responsible_user_id: user.id,
      completed: 0,
    });

    const listsResponse = await agent.get("/api/lists");
    expect(listsResponse.status).toBe(200);
    expect(
      listsResponse.body.map((list: { title: string }) => list.title),
    ).toEqual(expect.arrayContaining(["Wocheneinkauf", "Wochenmarkt"]));

    const detailResponse = await agent.get(`/api/lists/${listId}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body).toMatchObject({
      id: listId,
      title: "Wochenmarkt",
    });

    const updateResponse = await agent
      .patch(`/api/lists/${listId}`)
      .send({ title: "Wochenmarkt Samstag", completed: true });
    expect(updateResponse.status).toBe(200);
    expect(
      await integration
        .connection("shopping_lists")
        .where({ id: listId })
        .first(),
    ).toMatchObject({ title: "Wochenmarkt Samstag", completed: 1 });

    expect((await agent.delete(`/api/lists/${listId}`)).status).toBe(204);
    expect(
      await integration
        .connection("shopping_lists")
        .where({ id: listId })
        .first(),
    ).toBeUndefined();
  });

  test("item flow creates, reads, updates and deletes an item", async () => {
    const { agent } = await loginAs("alice", "alice1234");
    const list = await integration
      .connection("shopping_lists")
      .where({ title: "Wocheneinkauf" })
      .first();

    const createResponse = await agent
      .post(`/api/lists/${list.id}/items`)
      .send({ name: "Käse", quantity: 2 });
    expect(createResponse.status).toBe(201);
    const itemId = createResponse.body.id;

    expect(
      await integration
        .connection("shopping_items")
        .where({ id: itemId })
        .first(),
    ).toMatchObject({
      shopping_list_id: list.id,
      name: "Käse",
      quantity: 2,
      purchased: 0,
    });

    const itemsResponse = await agent.get(`/api/lists/${list.id}/items`);
    expect(itemsResponse.status).toBe(200);
    expect(
      itemsResponse.body.map((item: { name: string }) => item.name),
    ).toEqual(expect.arrayContaining(["Milch", "Brot", "Äpfel", "Käse"]));

    const updateResponse = await agent
      .patch(`/api/lists/${list.id}/items/${itemId}`)
      .send({ quantity: 3, purchased: true });
    expect(updateResponse.status).toBe(200);
    expect(
      await integration
        .connection("shopping_items")
        .where({ id: itemId })
        .first(),
    ).toMatchObject({ quantity: 3, purchased: 1 });

    expect(
      (await agent.delete(`/api/lists/${list.id}/items/${itemId}`)).status,
    ).toBe(204);
    expect(
      await integration
        .connection("shopping_items")
        .where({ id: itemId })
        .first(),
    ).toBeUndefined();
  });

  test("starts every test from the seeded state", async () => {
    expect(
      await integration.connection("shopping_lists").pluck("title"),
    ).toEqual(["Wocheneinkauf", "Grillabend", "Büromaterial"]);
    expect(
      await integration
        .connection("shopping_items")
        .where({ name: "Käse" })
        .first(),
    ).toBeUndefined();
  });
});
