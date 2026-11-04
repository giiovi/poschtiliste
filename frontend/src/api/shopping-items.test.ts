import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createShoppingItem,
  deleteShoppingItem,
  fetchShoppingItems,
  updateShoppingItem,
} from "./shopping-items";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("shopping-item api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("uses the nested list endpoints for all item operations", async () => {
    const item = {
      id: 4,
      shopping_list_id: 7,
      name: "Milk",
      quantity: 2,
      purchased: false,
      created_at: "2026-10-28 09:00:00",
      updated_at: "2026-10-28 09:00:00",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, [item]))
      .mockResolvedValueOnce(jsonResponse(201, item))
      .mockResolvedValueOnce(jsonResponse(200, { ...item, purchased: true }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchShoppingItems(7);
    await createShoppingItem(7, { name: "Milk", quantity: 2 });
    await updateShoppingItem(7, 4, { purchased: true });
    await deleteShoppingItem(7, 4);

    expect(fetchMock.mock.calls).toEqual([
      ["/api/lists/7/items", expect.objectContaining({ method: "GET" })],
      [
        "/api/lists/7/items",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Milk", quantity: 2 }),
        }),
      ],
      [
        "/api/lists/7/items/4",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ purchased: true }),
        }),
      ],
      ["/api/lists/7/items/4", expect.objectContaining({ method: "DELETE" })],
    ]);
  });
});
