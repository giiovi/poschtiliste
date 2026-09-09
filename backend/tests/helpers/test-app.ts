import path from "node:path";

import express, { type Express } from "express";
import knex, { type Knex } from "knex";
import request from "supertest";

import { wrapConnection } from "../../src/db/database";
import { errorHandler } from "../../src/middleware/error-handler";
import { createRequireAuth } from "../../src/middleware/require-auth";
import { createShoppingListRouter } from "../../src/routes/shopping-list-routes";
import { createShoppingListService } from "../../src/services/shopping-list-service";
import { createUserService } from "../../src/services/user-service";
import { createSessionMiddleware } from "../../src/session";

const migrationsDirectory = path.resolve(__dirname, "../../src/db/migrations");
const seedsDirectory = path.resolve(__dirname, "../../src/db/seeds");

export interface TestContext {
  connection: Knex;
  app: Express;
}

export async function createTestContext(): Promise<TestContext> {
  const connection = knex({
    client: "sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
    pool: { min: 1, max: 1 },
    migrations: { directory: migrationsDirectory, loadExtensions: [".ts"] },
    seeds: { directory: seedsDirectory, loadExtensions: [".ts"] },
  });
  await connection.migrate.latest();

  const database = wrapConnection(connection);

  const userService = createUserService(database);
  const requireAuth = createRequireAuth(userService);

  const app = express();
  app.use(express.json());
  app.use(
    createSessionMiddleware({
      SESSION_SECRET: "test-secret",
      NODE_ENV: "test",
    }),
  );

  // test-only helper that simulates a successful login until the login api exists
  app.post("/test/login/:userId", (httpRequest, response) => {
    httpRequest.session.userId = Number(httpRequest.params.userId);
    response.status(204).end();
  });

  app.use(
    "/api/lists",
    createShoppingListRouter(createShoppingListService(database), requireAuth),
  );
  app.use(errorHandler);

  return { connection, app };
}

export async function loginAs(app: Express, userId: number): Promise<string[]> {
  const response = await request(app).post(`/test/login/${userId}`);
  const cookies = response.get("Set-Cookie");

  if (!cookies) {
    throw new Error("Test login did not set a session cookie");
  }

  return cookies;
}
