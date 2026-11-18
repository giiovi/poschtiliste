import knex, { type Knex } from "knex";

import { createKnexEnvironmentConfig } from "./knex-config";

export interface Database {
  // knex instance for query building and transactions
  connection: Knex;
  all<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
}

export function wrapConnection(connection: Knex): Database {
  return {
    connection,
    async all<T>(sql: string, parameters: unknown[] = []): Promise<T[]> {
      const result: unknown = await connection.raw(
        sql,
        parameters as Knex.RawBinding[],
      );

      // sqlite returns the rows directly, postgres a result object with rows
      return Array.isArray(result)
        ? (result as T[])
        : (result as { rows: T[] }).rows;
    },
  };
}

export function createDatabase(
  environment: NodeJS.ProcessEnv = process.env,
): Database {
  const databaseEnvironment =
    environment.NODE_ENV === "test" ? "test" : "development";

  return wrapConnection(
    knex(createKnexEnvironmentConfig(environment, databaseEnvironment)),
  );
}
