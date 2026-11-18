import type { Knex } from "knex";

import { wrapConnection } from "../src/db/database";

function connectionReturning(result: unknown): Knex {
  return { raw: jest.fn().mockResolvedValue(result) } as unknown as Knex;
}

describe("database wrapper", () => {
  test("returns sqlite rows directly", async () => {
    const database = wrapConnection(connectionReturning([{ id: 1 }]));

    await expect(database.all("SELECT id FROM users")).resolves.toEqual([
      { id: 1 },
    ]);
  });

  test("returns the rows of a postgresql result", async () => {
    const database = wrapConnection(
      connectionReturning({
        command: "SELECT",
        rowCount: 1,
        rows: [{ id: 1 }],
      }),
    );

    await expect(database.all("SELECT id FROM users")).resolves.toEqual([
      { id: 1 },
    ]);
  });
});
