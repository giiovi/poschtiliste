import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import bcrypt from "bcrypt";
import knex, { type Knex } from "knex";
import request from "supertest";

import { createApp } from "../src/app";
import type { Database } from "../src/db/database";
import { SESSION_COOKIE_NAME } from "../src/session";

const migrationsDirectory = path.resolve(__dirname, "../src/db/migrations");

describe("auth routes", () => {
  let connection: Knex;
  let databaseDirectory: string;
  let database: Database;

  beforeAll(async () => {
    databaseDirectory = await mkdtemp(
      path.join(tmpdir(), "poschtiliste-auth-test-"),
    );
    connection = knex({
      client: "sqlite3",
      connection: { filename: path.join(databaseDirectory, "auth.sqlite") },
      useNullAsDefault: true,
      migrations: {
        directory: migrationsDirectory,
        loadExtensions: [".ts"],
      },
    });
    await connection.migrate.latest();

    database = {
      async all<T>(sql: string, parameters: unknown[] = []): Promise<T[]> {
        return (await connection.raw(
          sql,
          parameters as Knex.RawBinding[],
        )) as T[];
      },
    };
  });

  beforeEach(async () => {
    await connection("users").delete();
    await connection("users").insert({
      username: "alice",
      password_hash: await bcrypt.hash("correct-password", 4),
      role: "user",
    });
  });

  afterAll(async () => {
    await connection.destroy();
    await rm(databaseDirectory, { recursive: true, force: true });
  });

  test("login creates a session and returns the public user", async () => {
    const app = createApp({
      database,
      environment: { NODE_ENV: "test", SESSION_SECRET: "test-secret" },
    });
    app.get("/test/session", (request, response) => {
      response.json({ userId: request.session.userId ?? null });
    });
    const agent = request.agent(app);

    const response = await agent.post("/api/auth/login").send({
      username: "alice",
      password: "correct-password",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: expect.any(Number),
        username: "alice",
        role: "user",
      },
    });
    expect(response.headers["set-cookie"]?.[0]).toContain(
      `${SESSION_COOKIE_NAME}=`,
    );
    expect(response.body.user).not.toHaveProperty("passwordHash");

    const sessionResponse = await agent.get("/test/session");
    expect(sessionResponse.body).toEqual({ userId: response.body.user.id });
  });

  test.each([
    ["unknown user", "nobody", "correct-password"],
    ["wrong password", "alice", "wrong-password"],
  ])(
    "login returns the same 401 response for %s",
    async (_case, username, password) => {
      const app = createApp({
        database,
        environment: { NODE_ENV: "test", SESSION_SECRET: "test-secret" },
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({ username, password });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Invalid username or password" });
      expect(response.headers["set-cookie"]).toBeUndefined();
    },
  );

  test("requires the session secret from the environment", () => {
    expect(() =>
      createApp({ database, environment: { NODE_ENV: "test" } }),
    ).toThrow("Missing required environment variable: SESSION_SECRET");
  });

  test("GET /me returns the current public user", async () => {
    const app = createApp({
      database,
      environment: { NODE_ENV: "test", SESSION_SECRET: "test-secret" },
    });
    const agent = request.agent(app);

    await agent.post("/api/auth/login").send({
      username: "alice",
      password: "correct-password",
    });
    const response = await agent.get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: expect.any(Number),
        username: "alice",
        role: "user",
        created_at: expect.any(String),
        updated_at: expect.any(String),
      },
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(response.body.user).not.toHaveProperty("password_hash");
  });

  test("GET /me returns 401 without an authenticated session", async () => {
    const app = createApp({
      database,
      environment: { NODE_ENV: "test", SESSION_SECRET: "test-secret" },
    });

    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
  });

  test("POST /logout destroys the session and clears the cookie", async () => {
    const app = createApp({
      database,
      environment: { NODE_ENV: "test", SESSION_SECRET: "test-secret" },
    });
    const agent = request.agent(app);
    const loginResponse = await agent.post("/api/auth/login").send({
      username: "alice",
      password: "correct-password",
    });
    const sessionCookie = loginResponse.headers["set-cookie"]?.[0];

    expect(sessionCookie).toBeDefined();

    const logoutResponse = await agent.post("/api/auth/logout");

    expect(logoutResponse.status).toBe(204);
    expect(logoutResponse.headers["set-cookie"]?.[0]).toContain(
      `${SESSION_COOKIE_NAME}=;`,
    );

    const meResponse = await agent.get("/api/auth/me");
    expect(meResponse.status).toBe(401);

    const reusedCookieResponse = await request(app)
      .get("/api/auth/me")
      .set("Cookie", sessionCookie as string);
    expect(reusedCookieResponse.status).toBe(401);
  });
});
