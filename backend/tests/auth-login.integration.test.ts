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

describe("POST /api/auth/login", () => {
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

  test("creates a session and returns the public user for valid credentials", async () => {
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
    "returns the same 401 response for %s",
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
});
