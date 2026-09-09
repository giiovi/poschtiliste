import knex, { type Knex } from "knex";

import { createKnexConfig } from "./knex-config";

export interface Database {
  // knex instance for query building and transactions
  connection: Knex;
  all<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
}

export function wrapConnection(connection: Knex): Database {
  return {
    connection,
    async all<T>(sql: string, parameters: unknown[] = []): Promise<T[]> {
      const rows: unknown = await connection.raw(
        sql,
        parameters as Knex.RawBinding[],
      );

      return rows as T[];
    },
  };
}

export function createDatabase(
  environment: NodeJS.ProcessEnv = process.env,
): Database {
  const databaseEnvironment =
    environment.NODE_ENV === "test" ? "test" : "development";

  return wrapConnection(
    knex(createKnexConfig(environment)[databaseEnvironment]),
  );
}
