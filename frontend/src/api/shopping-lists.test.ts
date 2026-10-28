import { afterEach, describe, expect, test, vi } from "vitest";

import type { ShoppingListDetail } from "../types/shopping-list";
import { ApiError } from "./http";
import { createShoppingList, updateShoppingList } from "./shopping-lists";

const existingList: ShoppingListDetail = {
  id: 7,
  title: "Wocheneinkauf",
  due_date: null,
  responsible_user_id: 2,
  completed: false,
  created_at: "2026-10-28 09:00:00",
  updated_at: "2026-10-28 09:00:00",
  assigned_user_ids: [2, 3],
};

function mockFetch(responses: Response[]) {
  const fetchMock = vi.fn();

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

function requests(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(([path, init]) => [
    init.method,
    path,
    init.body === undefined ? undefined : JSON.parse(init.body),
  ]);
}

describe("shopping-list api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("turns backend validation errors into an ApiError", async () => {
    mockFetch([jsonResponse(400, { error: "Title is required" })]);

    const result = createShoppingList({
      title: " ",
      dueDate: null,
      responsibleUserId: 2,
      assignedUserIds: [],
    });

    await expect(result).rejects.toEqual(
      new ApiError(400, "Title is required"),
    );
  });

  test("updates fields and assignments, removing access last", async () => {
    const fetchMock = mockFetch([
      jsonResponse(200, existingList),
      jsonResponse(201, { assigned_user_ids: [1, 2, 3] }),
      jsonResponse(200, existingList),
      new Response(null, { status: 204 }),
    ]);

    await updateShoppingList(existingList, {
      title: "Party",
      dueDate: "2026-12-24",
      responsibleUserId: 3,
      assignedUserIds: [3, 1],
    });

    expect(requests(fetchMock)).toEqual([
      ["PATCH", "/api/lists/7", { title: "Party", dueDate: "2026-12-24" }],
      ["POST", "/api/lists/7/assignments", { userId: 1 }],
      ["PATCH", "/api/lists/7", { responsibleUserId: 3 }],
      ["DELETE", "/api/lists/7/assignments/2", undefined],
    ]);
  });

  test("stops before changing assignments when validation fails", async () => {
    const fetchMock = mockFetch([
      jsonResponse(400, { error: "Title is required" }),
    ]);

    await expect(
      updateShoppingList(existingList, {
        title: " ",
        dueDate: null,
        responsibleUserId: 2,
        assignedUserIds: [],
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
