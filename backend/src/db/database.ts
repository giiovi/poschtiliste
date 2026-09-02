import sqlite3 from "sqlite3";

export interface Database {
  all<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
}

export function createDatabase(
  filename = process.env.DATABASE_FILE ?? "./chinook.db",
): Database {
  const connection = new sqlite3.Database(filename);

  connection.on("trace", (sql: string) => {
    console.log(`DEBUG SQL: ${sql}`);
  });

  return {
    all<T>(sql: string, parameters: unknown[] = []): Promise<T[]> {
      return new Promise((resolve, reject) => {
        connection.all(sql, parameters, (error, rows: T[]) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(rows);
        });
      });
    },
  };
}
