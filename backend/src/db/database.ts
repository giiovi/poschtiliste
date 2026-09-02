import knex, { type Knex } from "knex";

import { createKnexConfig } from "./knex-config";

export interface Database {
  all<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
}

export function createDatabase(
  environment: NodeJS.ProcessEnv = process.env,
): Database {
  const databaseEnvironment =
    environment.NODE_ENV === "test" ? "test" : "development";
  const connection = knex(createKnexConfig(environment)[databaseEnvironment]);

  return {
    async all<T>(sql: string, parameters: unknown[] = []): Promise<T[]> {
      const rows: unknown = await connection.raw(
        sql,
        parameters as Knex.RawBinding[],
      );

      return rows as T[];
    },
  };
}
