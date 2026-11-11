import path from "node:path";

import type { Knex } from "knex";

type DatabaseEnvironment = "development" | "test";
type KnexEnvironments = Record<DatabaseEnvironment, Knex.Config>;

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

function sqliteConfiguration(
  environment: NodeJS.ProcessEnv,
  clientVariable: string,
  filenameVariable: string,
): Knex.Config {
  const sourceExtension = __filename.endsWith(".ts") ? ".ts" : ".js";

  return {
    client: requiredEnvironmentVariable(environment, clientVariable),
    connection: {
      filename: requiredEnvironmentVariable(environment, filenameVariable),
    },
    useNullAsDefault: true,
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
  return databaseEnvironment === "test"
    ? sqliteConfiguration(
        environment,
        "TEST_DATABASE_CLIENT",
        "TEST_DATABASE_FILENAME",
      )
    : sqliteConfiguration(environment, "DATABASE_CLIENT", "DATABASE_FILENAME");
}

export function createKnexConfig(
  environment: NodeJS.ProcessEnv,
): KnexEnvironments {
  return {
    development: createKnexEnvironmentConfig(environment, "development"),
    test: createKnexEnvironmentConfig(environment, "test"),
  };
}
