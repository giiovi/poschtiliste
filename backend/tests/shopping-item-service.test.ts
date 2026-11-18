import type { Knex } from "knex";

import type { Database } from "../src/db/database";
import { createShoppingItemService } from "../src/services/shopping-item-service";
import type { PublicUser } from "../src/types/user";

const admin = { id: 1, role: "admin" } as PublicUser;
const owner = { id: 2, role: "user" } as PublicUser;
const stranger = { id: 3, role: "user" } as PublicUser;
const listRow = { id: 7, responsible_user_id: 2 };
const itemRow = { id: 5, shopping_list_id: 7, name: "Milk", quantity: 2 };

function setup(...results: unknown[][]): {
  all: jest.Mock;
  service: ReturnType<typeof createShoppingItemService>;
} {
  const all = jest.fn();
  for (const result of results) {
    all.mockResolvedValueOnce(result);
  }
  const database: Database = { connection: {} as Knex, all };

  return { all, service: createShoppingItemService(database) };
}

describe("shopping item service", () => {
  test("reports a missing list for every operation", async () => {
    const { all, service } = setup([], [], [], []);

    const results = [
      await service.listForUser(7, admin),
      await service.createForUser(7, "Milk", 1, admin),
      await service.updateForUser(7, 5, {}, admin),
      await service.deleteForUser(7, 5, admin),
    ];

    expect(results).toEqual(Array(4).fill({ status: "not-found" }));
    expect(all).toHaveBeenCalledTimes(4);
  });

  test("reports forbidden for unassigned users without touching items", async () => {
    const { all, service } = setup([listRow], []);

    await expect(service.listForUser(7, stranger)).resolves.toEqual({
      status: "forbidden",
    });
    expect(all).toHaveBeenCalledTimes(2);
    expect(all).toHaveBeenLastCalledWith(
      expect.stringContaining("list_assignments"),
      [7, 3],
    );
  });

  test("allows assigned users and skips the assignment query for owners", async () => {
    const assigned = setup([listRow], [{ user_id: 3 }], []);
    await expect(assigned.service.listForUser(7, stranger)).resolves.toEqual({
      status: "ok",
      value: [],
    });
    expect(assigned.all).toHaveBeenCalledTimes(3);

    const ownerSetup = setup([listRow], []);
    await ownerSetup.service.listForUser(7, owner);
    expect(ownerSetup.all).toHaveBeenCalledTimes(2);
  });

  test("maps purchased integers to booleans when listing", async () => {
    const { all, service } = setup(
      [listRow],
      [
        { ...itemRow, purchased: 0 },
        { ...itemRow, id: 6, purchased: 1 },
      ],
    );

    const result = await service.listForUser(7, owner);

    expect(result).toMatchObject({
      status: "ok",
      value: [{ purchased: false }, { purchased: true }],
    });
    expect(all).toHaveBeenLastCalledWith(
      expect.stringContaining("FROM shopping_items"),
      [7],
    );
  });

  test("creates an item with the given parameters", async () => {
    const { all, service } = setup([listRow], [{ ...itemRow, purchased: 0 }]);

    const result = await service.createForUser(7, "Milk", 2, owner);

    expect(result).toEqual({
      status: "ok",
      value: { ...itemRow, purchased: false },
    });
    expect(all).toHaveBeenLastCalledWith(
      expect.stringContaining("INSERT INTO shopping_items"),
      [7, "Milk", 2],
    );
  });

  test.each([
    [{ name: "Bread", quantity: 3, purchased: false }, ["Bread", 3, false]],
    [{ purchased: true }, [null, null, true]],
    [{}, [null, null, null]],
  ])("updates with %p", async (update, expected) => {
    const { all, service } = setup([listRow], [{ ...itemRow, purchased: 1 }]);

    const result = await service.updateForUser(7, 5, update, owner);

    expect(result).toMatchObject({ status: "ok", value: { purchased: true } });
    expect(all).toHaveBeenLastCalledWith(
      expect.stringContaining("UPDATE shopping_items"),
      [...expected, 5, 7],
    );
  });

  test("reports item-not-found when update or delete match no row", async () => {
    const { service } = setup([listRow], [], [listRow], []);

    await expect(service.updateForUser(7, 5, {}, owner)).resolves.toEqual({
      status: "item-not-found",
    });
    await expect(service.deleteForUser(7, 5, owner)).resolves.toEqual({
      status: "item-not-found",
    });
  });

  test("deletes an item scoped to its list", async () => {
    const { all, service } = setup([listRow], [{ id: 5 }]);

    await expect(service.deleteForUser(7, 5, owner)).resolves.toEqual({
      status: "ok",
      value: null,
    });
    expect(all).toHaveBeenLastCalledWith(
      expect.stringContaining("DELETE FROM shopping_items"),
      [5, 7],
    );
  });
});
