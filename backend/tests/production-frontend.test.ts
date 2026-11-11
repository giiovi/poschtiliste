import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { Knex } from "knex";
import request from "supertest";

import { createApp } from "../src/app";
import type { Database } from "../src/db/database";

describe("production frontend", () => {
  let frontendDirectory: string;

  beforeEach(async () => {
    frontendDirectory = await mkdtemp(
      path.join(tmpdir(), "poschtiliste-frontend-"),
    );
    await writeFile(
      path.join(frontendDirectory, "index.html"),
      "<!doctype html><title>Poschtilischte</title>",
    );
    await writeFile(
      path.join(frontendDirectory, "app.js"),
      "console.log('poschtilischte');",
    );
  });

  afterEach(async () => {
    await rm(frontendDirectory, { recursive: true, force: true });
  });

  function productionApp() {
    const database: Database = {
      connection: {} as Knex,
      async all<T>(): Promise<T[]> {
        return [];
      },
    };

    return createApp({
      database,
      environment: {
        NODE_ENV: "production",
        SESSION_SECRET: "production-test-secret",
        SESSION_COOKIE_SECURE: "false",
        FRONTEND_DIST_DIR: frontendDirectory,
      },
    });
  }

  test("serves built assets and the SPA entry point", async () => {
    const app = productionApp();

    await request(app)
      .get("/")
      .expect(200)
      .expect("Content-Type", /html/)
      .expect(/Poschtilischte/);
    await request(app)
      .get("/app.js")
      .expect(200)
      .expect("Content-Type", /javascript/);
    await request(app)
      .get("/lists/42")
      .expect(200)
      .expect(/Poschtilischte/);
  });

  test("does not replace unknown API responses with the SPA", async () => {
    await request(productionApp()).get("/api/unknown").expect(404);
  });
});
