import bcrypt from "bcrypt";
import request from "supertest";

import {
  createTestContext,
  loginAs,
  type TestContext,
} from "./helpers/test-app";

const bcryptHash = `$2b$12$${"a".repeat(53)}`;

type Method = "get" | "post" | "patch" | "delete" | "put";

describe("admin user-management API", () => {
  let context: TestContext;
  let adminId: number;
  let aliceId: number;
  let bobId: number;

  async function send(
    userId: number | null,
    method: Method,
    path: string,
    body?: object,
  ) {
    const call = request(context.app)[method](path);

    if (userId !== null) {
      call.set("Cookie", await loginAs(context.app, userId));
    }

    return call.send(body);
  }

  const asAdmin = (method: Method, path: string, body?: object) =>
    send(adminId, method, path, body);

  const storedUser = (id: number) =>
    context.connection("users").where("id", id).first();

  beforeEach(async () => {
    context = await createTestContext();
    const ids: number[] = [];

    for (const [username, role] of [
      ["admin", "admin"],
      ["alice", "user"],
      ["bob", "user"],
    ]) {
      const [id] = await context
        .connection("users")
        .insert({ username, password_hash: bcryptHash, role });
      ids.push(id);
    }

    [adminId, aliceId, bobId] = ids;
  });

  afterEach(async () => {
    await context.connection.destroy();
  });

  test.each<[Method, string]>([
    ["get", ""],
    ["post", ""],
    ["patch", "/2"],
    ["delete", "/2"],
    ["put", "/2/password"],
  ])(
    "%s %s answers 401 without session and 403 for users",
    async (method, path) => {
      const url = `/api/admin/users${path}`;

      expect((await send(null, method, url)).status).toBe(401);
      expect((await send(aliceId, method, url)).status).toBe(403);
    },
  );

  test("lists all users without password hashes", async () => {
    const response = await asAdmin("get", "/api/admin/users");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(Object.keys(response.body[0]).sort()).toEqual([
      "created_at",
      "id",
      "role",
      "updated_at",
      "username",
    ]);
  });

  test("creates a user with a hashed password and the default role", async () => {
    const response = await asAdmin("post", "/api/admin/users", {
      username: " carol ",
      password: "carol1234",
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ username: "carol", role: "user" });
    const { password_hash } = await storedUser(response.body.id);
    expect(await bcrypt.compare("carol1234", password_hash)).toBe(true);
  });

  test.each([
    [{ username: "alice", password: "alice1234" }, 409],
    [{ username: "carol", password: "short" }, 400],
    [{ username: "carol", password: "carol1234", role: "owner" }, 400],
  ])("rejects invalid or duplicate users %#", async (body, status) => {
    expect((await asAdmin("post", "/api/admin/users", body)).status).toBe(
      status,
    );
  });

  test("updates username and role", async () => {
    const response = await asAdmin("patch", `/api/admin/users/${bobId}`, {
      username: "robert",
      role: "admin",
    });

    expect(response.status).toBe(200);
    expect(await storedUser(bobId)).toMatchObject({
      username: "robert",
      role: "admin",
    });
    expect(
      (
        await asAdmin("patch", `/api/admin/users/${bobId}`, {
          username: "alice",
        })
      ).status,
    ).toBe(409);
  });

  test("deletes a user together with the list assignments", async () => {
    const [listId] = await context
      .connection("shopping_lists")
      .insert({ title: "Wocheneinkauf", responsible_user_id: aliceId });
    await context
      .connection("list_assignments")
      .insert({ shopping_list_id: listId, user_id: bobId });

    expect((await asAdmin("delete", `/api/admin/users/${bobId}`)).status).toBe(
      204,
    );
    expect(await storedUser(bobId)).toBeUndefined();
    expect(await context.connection("list_assignments")).toHaveLength(0);

    // alice is still responsible for the list
    expect(
      (await asAdmin("delete", `/api/admin/users/${aliceId}`)).status,
    ).toBe(409);
  });

  test("prevents administrators from locking themselves out", async () => {
    const url = `/api/admin/users/${adminId}`;

    expect((await asAdmin("patch", url, { role: "user" })).status).toBe(409);
    expect((await asAdmin("delete", url)).status).toBe(409);
    expect(await storedUser(adminId)).toMatchObject({ role: "admin" });
  });

  test("resets the password as a bcrypt hash", async () => {
    const url = `/api/admin/users/${bobId}/password`;

    expect((await asAdmin("put", url, { password: "short" })).status).toBe(400);
    expect((await asAdmin("put", url, { password: "new-secret" })).status).toBe(
      204,
    );
    const { password_hash } = await storedUser(bobId);
    expect(await bcrypt.compare("new-secret", password_hash)).toBe(true);
  });

  test("returns 404 for unknown users", async () => {
    const url = "/api/admin/users/9999";

    expect((await asAdmin("patch", url, { role: "admin" })).status).toBe(404);
    expect((await asAdmin("delete", url)).status).toBe(404);
    expect(
      (await asAdmin("put", `${url}/password`, { password: "new-secret" }))
        .status,
    ).toBe(404);
  });
});
