import request from "supertest";

import {
  createTestContext,
  loginAs,
  type TestContext,
} from "./helpers/test-app";

const bcryptHash = `$2b$12$${"a".repeat(53)}`;

describe("shopping-item routes", () => {
  let context: TestContext;
  let adminId: number;
  let aliceId: number;
  let bobId: number;
  let carolId: number;
  let shoppingListId: number;
  let cookiesByUserId: Map<number, string[]>;

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
    [shoppingListId] = await connection("shopping_lists").insert({
      title: "Alice list",
      responsible_user_id: aliceId,
    });
    await connection("list_assignments").insert({
      shopping_list_id: shoppingListId,
      user_id: bobId,
    });
    await connection("shopping_items").insert([
      {
        shopping_list_id: shoppingListId,
        name: "Milk",
        quantity: 2,
        purchased: false,
      },
      {
        shopping_list_id: shoppingListId,
        name: "Bread",
        quantity: 1,
        purchased: true,
      },
    ]);

    cookiesByUserId = new Map();
  });

  afterEach(async () => {
    await context.connection.destroy();
  });

  async function cookiesFor(userId: number): Promise<string[]> {
    let cookies = cookiesByUserId.get(userId);

    if (!cookies) {
      cookies = await loginAs(context.app, userId);
      cookiesByUserId.set(userId, cookies);
    }

    return cookies;
  }

  test("returns all items of an accessible list", async () => {
    const response = await request(context.app)
      .get(`/api/lists/${shoppingListId}/items`)
      .set("Cookie", await cookiesFor(bobId));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body).toEqual([
      expect.objectContaining({ name: "Milk", quantity: 2, purchased: false }),
      expect.objectContaining({ name: "Bread", quantity: 1, purchased: true }),
    ]);
  });

  test("allows administrators to retrieve items from every list", async () => {
    const response = await request(context.app)
      .get(`/api/lists/${shoppingListId}/items`)
      .set("Cookie", await cookiesFor(adminId));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  test("returns 401 when no user is authenticated", async () => {
    const response = await request(context.app).get(
      `/api/lists/${shoppingListId}/items`,
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
  });

  test("returns 403 when a user cannot access the list", async () => {
    const response = await request(context.app)
      .get(`/api/lists/${shoppingListId}/items`)
      .set("Cookie", await cookiesFor(carolId));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Shopping list access denied" });
  });

  test("returns 404 when the shopping list does not exist", async () => {
    const response = await request(context.app)
      .get("/api/lists/99999/items")
      .set("Cookie", await cookiesFor(aliceId));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Shopping list not found" });
  });

  test("creates and persists a trimmed item with the supplied quantity", async () => {
    const response = await request(context.app)
      .post(`/api/lists/${shoppingListId}/items`)
      .set("Cookie", await cookiesFor(aliceId))
      .send({ name: "  Apples  ", quantity: 4 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      shopping_list_id: shoppingListId,
      name: "Apples",
      quantity: 4,
      purchased: false,
    });

    const storedItem = await context
      .connection("shopping_items")
      .where({ id: response.body.id })
      .first();
    expect(storedItem).toMatchObject({
      shopping_list_id: shoppingListId,
      name: "Apples",
      quantity: 4,
      purchased: 0,
    });
  });

  test("defaults the quantity to one", async () => {
    const response = await request(context.app)
      .post(`/api/lists/${shoppingListId}/items`)
      .set("Cookie", await cookiesFor(aliceId))
      .send({ name: "Eggs" });

    expect(response.status).toBe(201);
    expect(response.body.quantity).toBe(1);
  });

  test.each([
    [{ name: "", quantity: 1 }],
    [{ name: "Milk", quantity: 0 }],
    [{ name: "Milk", quantity: -1 }],
    [{ name: "Milk", quantity: 1.5 }],
    [{ name: "Milk", quantity: "2" }],
  ])("rejects invalid item data %#", async (body) => {
    const response = await request(context.app)
      .post(`/api/lists/${shoppingListId}/items`)
      .set("Cookie", await cookiesFor(aliceId))
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid shopping item data" });
  });

  test("does not create an item for a foreign list", async () => {
    const response = await request(context.app)
      .post(`/api/lists/${shoppingListId}/items`)
      .set("Cookie", await cookiesFor(carolId))
      .send({ name: "Secret item", quantity: 1 });

    expect(response.status).toBe(403);
    expect(
      await context.connection("shopping_items").where({
        shopping_list_id: shoppingListId,
        name: "Secret item",
      }),
    ).toHaveLength(0);
  });

  test("rejects an invalid list id", async () => {
    const response = await request(context.app)
      .get("/api/lists/not-a-number/items")
      .set("Cookie", await cookiesFor(aliceId));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid shopping list id" });
  });
});
