import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { Express } from "express";
import knex, { type Knex } from "knex";

import { createApp } from "../../src/app";
import { wrapConnection } from "../../src/db/database";
import { createKnexConfig } from "../../src/db/knex-config";

export interface IntegrationDatabase {
  connection: Knex;
  app: Express;
  reset(): Promise<void>;
  destroy(): Promise<void>;
}

// opens a separate file-based sqlite database through the knex test environment
export async function createIntegrationDatabase(): Promise<IntegrationDatabase> {
  const databaseDirectory = await mkdtemp(
    path.join(tmpdir(), "poschtiliste-integration-"),
  );
  const environment: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    SESSION_SECRET: "integration-test-secret",
    // required by the knex config, never opened because NODE_ENV is test
    DATABASE_CLIENT: "sqlite3",
    DATABASE_FILENAME: path.join(databaseDirectory, "unused.sqlite"),
    TEST_DATABASE_CLIENT: "sqlite3",
    TEST_DATABASE_FILENAME: path.join(databaseDirectory, "test.sqlite"),
  };
  const connection = knex(createKnexConfig(environment).test);
  const app = createApp({ database: wrapConnection(connection), environment });

  return {
    connection,
    app,
    async reset() {
      await connection.migrate.rollback(undefined, true);
      await connection.migrate.latest();
      await connection.seed.run();
    },
    async destroy() {
      await connection.destroy();
      await rm(databaseDirectory, { recursive: true, force: true });
    },
  };
}
