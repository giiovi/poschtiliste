import path from "node:path";

import type { Knex } from "knex";
import { types } from "pg";

type DatabaseEnvironment = "development" | "test";
type KnexEnvironments = Record<DatabaseEnvironment, Knex.Config>;

const postgresClients = new Set(["pg", "postgres", "postgresql"]);
const defaultPostgresPort = 5432;

// keep date columns as yyyy-mm-dd strings like sqlite instead of local midnight Date objects
types.setTypeParser(types.builtins.DATE, (value: string) => value);

function requiredEnvironmentVariable(
  environment: NodeJS.ProcessEnv,
  name: string,
): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function postgresConnection(
  environment: NodeJS.ProcessEnv,
  prefix: string,
): Knex.PgConnectionConfig {
  return {
    host: requiredEnvironmentVariable(environment, `${prefix}DATABASE_HOST`),
    port: Number(
      environment[`${prefix}DATABASE_PORT`]?.trim() || defaultPostgresPort,
    ),
    database: requiredEnvironmentVariable(
      environment,
      `${prefix}DATABASE_NAME`,
    ),
    user: requiredEnvironmentVariable(environment, `${prefix}DATABASE_USER`),
    password: requiredEnvironmentVariable(
      environment,
      `${prefix}DATABASE_PASSWORD`,
    ),
  };
}

function databaseConfiguration(
  environment: NodeJS.ProcessEnv,
  prefix: string,
): Knex.Config {
  const sourceExtension = __filename.endsWith(".ts") ? ".ts" : ".js";
  const client = requiredEnvironmentVariable(
    environment,
    `${prefix}DATABASE_CLIENT`,
  );
  const isPostgres = postgresClients.has(client);

  return {
    client,
    connection: isPostgres
      ? postgresConnection(environment, prefix)
      : {
          filename: requiredEnvironmentVariable(
            environment,
            `${prefix}DATABASE_FILENAME`,
          ),
        },
    // sqlite has no DEFAULT keyword in multi row inserts, postgres does
    useNullAsDefault: !isPostgres,
    migrations: {
      directory: path.resolve(__dirname, "migrations"),
      loadExtensions: [sourceExtension],
    },
    seeds: {
      directory: path.resolve(__dirname, "seeds"),
      loadExtensions: [sourceExtension],
    },
  };
}

export function createKnexEnvironmentConfig(
  environment: NodeJS.ProcessEnv,
  databaseEnvironment: DatabaseEnvironment,
): Knex.Config {
  return databaseConfiguration(
    environment,
    databaseEnvironment === "test" ? "TEST_" : "",
  );
}

export function createKnexConfig(
  environment: NodeJS.ProcessEnv,
): KnexEnvironments {
  return {
    development: createKnexEnvironmentConfig(environment, "development"),
    test: createKnexEnvironmentConfig(environment, "test"),
  };
}
