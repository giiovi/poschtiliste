import type { Knex } from "knex";

import type { Database } from "../src/db/database";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../src/errors/http-error";
import { createShoppingListService } from "../src/services/shopping-list-service";
import type { PublicUser } from "../src/types/user";

const admin = { id: 1, role: "admin" } as PublicUser;
const owner = { id: 2, role: "user" } as PublicUser;
const stranger = { id: 3, role: "user" } as PublicUser;
const listRow = { id: 7, title: "Party", responsible_user_id: 2, completed: 0 };

interface Call {
  table: string;
  method: string;
  args: unknown[];
}

// queued results are consumed per table, each awaited query takes the next one
function setup(queues: Record<string, unknown[]> = {}): {
  all: jest.Mock;
  calls: Call[];
  service: ReturnType<typeof createShoppingListService>;
} {
  const calls: Call[] = [];
  const createBuilder = (table: string): unknown => {
    const builder: Record<string, unknown> = {
      then: (resolve: (value: unknown) => unknown) =>
        resolve(queues[table]?.shift()),
    };
    for (const method of [
      "select",
      "where",
      "whereIn",
      "orderBy",
      "first",
      "insert",
      "update",
      "delete",
    ]) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }
    return builder;
  };
  const fakeTransaction = Object.assign(createBuilder, {
    fn: { now: () => "NOW" },
  });
  const all = jest.fn();
  const database: Database = {
    connection: {
      transaction: jest.fn((callback) => callback(fakeTransaction)),
    } as unknown as Knex,
    all,
  };

  return { all, calls, service: createShoppingListService(database) };
}

const findCalls = (calls: Call[], table: string, method: string): Call[] =>
  calls.filter((call) => call.table === table && call.method === method);

describe("shopping list service", () => {
  test("lists all lists for admins and filtered lists for users", async () => {
    const { all, service } = setup();
    all.mockResolvedValue([listRow]);

    await expect(service.listForUser(admin)).resolves.toEqual([
      { ...listRow, completed: false },
    ]);
    expect(all).toHaveBeenLastCalledWith(expect.not.stringContaining("WHERE"));

    await service.listForUser(owner);
    expect(all).toHaveBeenLastCalledWith(
      expect.stringContaining("WHERE"),
      [2, 2],
    );
  });

  test("returns notification recipient ids", async () => {
    const { all, service } = setup();
    all.mockResolvedValue([{ user_id: 2 }, { user_id: 4 }]);

    await expect(service.notificationRecipientIds(7)).resolves.toEqual([2, 4]);
    expect(all).toHaveBeenCalledWith(expect.any(String), [7, 7]);
  });

  test("finds a list with its assignments", async () => {
    const { service } = setup({
      shopping_lists: [listRow, [listRow]],
      list_assignments: [[{ user_id: 3 }, { user_id: 4 }]],
    });

    await expect(service.findForUser(7, owner)).resolves.toEqual({
      ...listRow,
      completed: false,
      assigned_user_ids: [3, 4],
    });
  });

  test.each([
    ["missing list", {}, NotFoundError],
    [
      "unassigned user",
      { shopping_lists: [listRow], list_assignments: [undefined] },
      ForbiddenError,
    ],
  ])("rejects access for %s", async (_name, queues, errorType) => {
    const { service } = setup(queues);

    await expect(service.findForUser(7, stranger)).rejects.toThrow(errorType);
  });

  test("rejects unknown referenced users on create", async () => {
    const { calls, service } = setup({ users: [[{ id: 2 }]] });

    const result = service.create({
      title: "Party",
      dueDate: null,
      responsibleUserId: 2,
      assignedUserIds: [9, 8],
    });

    await expect(result).rejects.toThrow("Unknown user id(s): 8, 9");
    expect(findCalls(calls, "shopping_lists", "insert")).toHaveLength(0);
  });

  test("creates a list with deduplicated user lookup and assignments", async () => {
    const { calls, service } = setup({
      users: [[{ id: 2 }, { id: 3 }]],
      shopping_lists: [[7], [listRow]],
    });

    const result = await service.create({
      title: "Party",
      dueDate: "2030-01-01",
      responsibleUserId: 2,
      assignedUserIds: [3, 2],
    });

    expect(findCalls(calls, "users", "whereIn")[0].args).toEqual([
      "id",
      [2, 3],
    ]);
    expect(findCalls(calls, "shopping_lists", "insert")[0].args).toEqual([
      { title: "Party", due_date: "2030-01-01", responsible_user_id: 2 },
    ]);
    expect(findCalls(calls, "list_assignments", "insert")[0].args).toEqual([
      [
        { shopping_list_id: 7, user_id: 3 },
        { shopping_list_id: 7, user_id: 2 },
      ],
    ]);
    expect(result.assigned_user_ids).toEqual([3, 2]);
  });

  test("skips the assignment insert without assigned users", async () => {
    const { calls, service } = setup({
      users: [[{ id: 2 }]],
      shopping_lists: [[7], [listRow]],
    });

    await service.create({
      title: "Party",
      dueDate: null,
      responsibleUserId: 2,
      assignedUserIds: [],
    });

    expect(findCalls(calls, "list_assignments", "insert")).toHaveLength(0);
  });

  test("updates only the given fields", async () => {
    const { calls, service } = setup({
      shopping_lists: [listRow, undefined, [{ ...listRow, completed: 1 }]],
    });

    await expect(
      service.update(7, { completed: true }, owner),
    ).resolves.toMatchObject({ completed: true });
    expect(findCalls(calls, "shopping_lists", "update")[0].args).toEqual([
      { completed: true, updated_at: "NOW" },
    ]);
  });

  test("rejects an update with an unknown responsible user", async () => {
    const { service } = setup({ shopping_lists: [listRow], users: [[]] });

    await expect(
      service.update(7, { responsibleUserId: 9 }, owner),
    ).rejects.toThrow(ValidationError);
  });

  test("removes items, assignments and the list in order", async () => {
    const { calls, service } = setup({ shopping_lists: [listRow] });

    await service.remove(7, owner);

    const deletes = calls.filter((call) => call.method === "delete");
    expect(deletes.map((call) => call.table)).toEqual([
      "shopping_items",
      "list_assignments",
      "shopping_lists",
    ]);
  });

  test("does not delete anything without access", async () => {
    const { calls, service } = setup({ shopping_lists: [listRow] });

    await expect(service.remove(7, stranger)).rejects.toThrow(ForbiddenError);
    expect(calls.filter((call) => call.method === "delete")).toHaveLength(0);
  });

  test("adds an assignment and returns the user ids", async () => {
    const { calls, service } = setup({
      shopping_lists: [listRow],
      users: [[{ id: 3 }]],
      list_assignments: [undefined, undefined, [{ user_id: 3 }]],
    });

    await expect(service.addAssignment(7, 3, owner)).resolves.toEqual([3]);
    expect(findCalls(calls, "list_assignments", "insert")[0].args).toEqual([
      { shopping_list_id: 7, user_id: 3 },
    ]);
  });

  test("rejects a duplicate assignment", async () => {
    const { service } = setup({
      shopping_lists: [listRow],
      users: [[{ id: 3 }]],
      list_assignments: [{ user_id: 3 }],
    });

    await expect(service.addAssignment(7, 3, owner)).rejects.toThrow(
      ConflictError,
    );
  });

  test("removes an assignment and rejects a missing one", async () => {
    const { service } = setup({
      shopping_lists: [listRow, listRow],
      list_assignments: [1, 0],
    });

    await expect(
      service.removeAssignment(7, 3, owner),
    ).resolves.toBeUndefined();
    await expect(service.removeAssignment(7, 3, owner)).rejects.toThrow(
      NotFoundError,
    );
  });
});
