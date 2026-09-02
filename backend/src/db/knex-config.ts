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
  return {
    client: requiredEnvironmentVariable(environment, clientVariable),
    connection: {
      filename: requiredEnvironmentVariable(environment, filenameVariable),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.resolve(__dirname, "migrations"),
      loadExtensions: [".ts"],
    },
  };
}

export function createKnexConfig(
  environment: NodeJS.ProcessEnv,
): KnexEnvironments {
  return {
    development: sqliteConfiguration(
      environment,
      "DATABASE_CLIENT",
      "DATABASE_FILENAME",
    ),
    test: sqliteConfiguration(
      environment,
      "TEST_DATABASE_CLIENT",
      "TEST_DATABASE_FILENAME",
    ),
  };
}
