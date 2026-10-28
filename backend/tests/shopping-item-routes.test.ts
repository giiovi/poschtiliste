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
  let milkItemId: number;
  let breadItemId: number;
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
    [milkItemId] = await connection("shopping_items").insert({
      shopping_list_id: shoppingListId,
      name: "Milk",
      quantity: 2,
      purchased: false,
    });
    [breadItemId] = await connection("shopping_items").insert({
      shopping_list_id: shoppingListId,
      name: "Bread",
      quantity: 1,
      purchased: true,
    });

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

  async function deleteItemAs(
    userId: number,
    listId: number | string,
    itemId: number | string,
  ) {
    return request(context.app)
      .delete(`/api/lists/${listId}/items/${itemId}`)
      .set("Cookie", await cookiesFor(userId));
  }

  async function itemIdByName(name: string): Promise<number> {
    const item = await context
      .connection("shopping_items")
      .where({ name })
      .first();
    return item.id;
  }

  async function remainingItemNames(): Promise<string[]> {
    const rows = await context
      .connection("shopping_items")
      .where({ shopping_list_id: shoppingListId })
      .orderBy("id");
    return rows.map((row) => row.name);
  }

  test("deletes an item of an accessible list", async () => {
    const response = await deleteItemAs(
      bobId,
      shoppingListId,
      await itemIdByName("Milk"),
    );

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
    expect(await remainingItemNames()).toEqual(["Bread"]);
  });

  test("allows administrators to delete items from every list", async () => {
    const response = await deleteItemAs(
      adminId,
      shoppingListId,
      await itemIdByName("Bread"),
    );

    expect(response.status).toBe(204);
    expect(await remainingItemNames()).toEqual(["Milk"]);
  });

  test("returns 404 when the item does not exist", async () => {
    const response = await deleteItemAs(aliceId, shoppingListId, 99999);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Shopping item not found" });
  });

  test("does not delete an item through another accessible list", async () => {
    const [otherListId] = await context.connection("shopping_lists").insert({
      title: "Carol list",
      responsible_user_id: carolId,
    });
    await context
      .connection("shopping_items")
      .insert({ shopping_list_id: otherListId, name: "Cheese", quantity: 1 });

    const response = await deleteItemAs(
      aliceId,
      shoppingListId,
      await itemIdByName("Cheese"),
    );

    expect(response.status).toBe(404);
    expect(
      await context.connection("shopping_items").where({ name: "Cheese" }),
    ).toHaveLength(1);
  });

  test("returns 404 when the shopping list does not exist", async () => {
    const response = await deleteItemAs(aliceId, 99999, 1);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Shopping list not found" });
  });

  test("returns 403 and keeps the item for users without access", async () => {
    const response = await deleteItemAs(
      carolId,
      shoppingListId,
      await itemIdByName("Milk"),
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Shopping list access denied" });
    expect(await remainingItemNames()).toEqual(["Milk", "Bread"]);
  });

  test("returns 401 for item deletion without a session", async () => {
    const response = await request(context.app).delete(
      `/api/lists/${shoppingListId}/items/${await itemIdByName("Milk")}`,
    );

    expect(response.status).toBe(401);
    expect(await remainingItemNames()).toEqual(["Milk", "Bread"]);
  });

  test("rejects an invalid item id", async () => {
    const response = await deleteItemAs(aliceId, shoppingListId, "abc");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid shopping item id" });
  });

  test("rejects an invalid list id", async () => {
    const response = await request(context.app)
      .get("/api/lists/not-a-number/items")
      .set("Cookie", await cookiesFor(aliceId));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid shopping list id" });
  });

  test("updates an item's name and quantity", async () => {
    const response = await request(context.app)
      .patch(`/api/lists/${shoppingListId}/items/${milkItemId}`)
      .set("Cookie", await cookiesFor(bobId))
      .send({ name: "  Oat milk  ", quantity: 3 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: milkItemId,
      name: "Oat milk",
      quantity: 3,
      purchased: false,
    });

    const storedItem = await context
      .connection("shopping_items")
      .where({ id: milkItemId })
      .first();
    expect(storedItem).toMatchObject({ name: "Oat milk", quantity: 3 });
  });

  test("marks an item as purchased and can unmark it", async () => {
    const purchasedResponse = await request(context.app)
      .patch(`/api/lists/${shoppingListId}/items/${milkItemId}`)
      .set("Cookie", await cookiesFor(aliceId))
      .send({ purchased: true });

    expect(purchasedResponse.status).toBe(200);
    expect(purchasedResponse.body.purchased).toBe(true);

    const unpurchasedResponse = await request(context.app)
      .patch(`/api/lists/${shoppingListId}/items/${breadItemId}`)
      .set("Cookie", await cookiesFor(aliceId))
      .send({ purchased: false });

    expect(unpurchasedResponse.status).toBe(200);
    expect(unpurchasedResponse.body.purchased).toBe(false);

    const storedItems = await context
      .connection("shopping_items")
      .whereIn("id", [milkItemId, breadItemId])
      .orderBy("id");
    expect(storedItems.map((item) => item.purchased)).toEqual([1, 0]);
  });

  test.each([
    [{}],
    [{ name: "" }],
    [{ name: "Milk", quantity: 0 }],
    [{ quantity: -1 }],
    [{ quantity: 1.5 }],
    [{ quantity: "2" }],
    [{ purchased: 1 }],
  ])("rejects invalid item update data %#", async (body) => {
    const response = await request(context.app)
      .patch(`/api/lists/${shoppingListId}/items/${milkItemId}`)
      .set("Cookie", await cookiesFor(aliceId))
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid shopping item data" });
  });

  test("does not update an item for a user without list access", async () => {
    const response = await request(context.app)
      .patch(`/api/lists/${shoppingListId}/items/${milkItemId}`)
      .set("Cookie", await cookiesFor(carolId))
      .send({ purchased: true });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Shopping list access denied" });

    const storedItem = await context
      .connection("shopping_items")
      .where({ id: milkItemId })
      .first();
    expect(storedItem.purchased).toBe(0);
  });

  test("returns 404 when the item does not exist in the list", async () => {
    const response = await request(context.app)
      .patch(`/api/lists/${shoppingListId}/items/99999`)
      .set("Cookie", await cookiesFor(aliceId))
      .send({ quantity: 2 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Shopping item not found" });
  });

  test("rejects an invalid item id", async () => {
    const response = await request(context.app)
      .patch(`/api/lists/${shoppingListId}/items/not-a-number`)
      .set("Cookie", await cookiesFor(aliceId))
      .send({ quantity: 2 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid shopping item id" });
  });
});
