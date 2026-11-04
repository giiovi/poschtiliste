import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { RealtimeEvent } from "../realtime/events";
import type { ShoppingList } from "../types/shopping-list";
import ShoppingListDashboard from "./ShoppingListDashboard.vue";

const api = vi.hoisted(() => ({ fetchShoppingLists: vi.fn() }));
const realtime = vi.hoisted(() => ({
  listener: undefined as ((event: RealtimeEvent) => void) | undefined,
  subscribeRealtime: vi.fn(),
}));

vi.mock("../api/shopping-lists", () => ({
  fetchShoppingLists: api.fetchShoppingLists,
  UnauthenticatedError: class extends Error {},
}));

vi.mock("../realtime/socket", () => ({
  subscribeRealtime: realtime.subscribeRealtime,
}));

const list: ShoppingList = {
  id: 7,
  title: "Wocheneinkauf",
  due_date: null,
  responsible_user_id: 2,
  completed: false,
  created_at: "2026-11-04 10:00:00",
  updated_at: "2026-11-04 10:00:00",
};

describe("ShoppingListDashboard realtime updates", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    realtime.subscribeRealtime.mockImplementation((listener) => {
      realtime.listener = listener;
      return vi.fn();
    });
  });

  test("refreshes the cards in the background after an event", async () => {
    api.fetchShoppingLists
      .mockResolvedValueOnce([list])
      .mockResolvedValueOnce([{ ...list, title: "Party" }]);
    const wrapper = mount(ShoppingListDashboard, {
      global: {
        stubs: { RouterLink: { template: "<a><slot /></a>" } },
      },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Wocheneinkauf");

    realtime.listener?.({
      name: "list:updated",
      payload: { listId: 7, actorUserId: 3, change: "updated" },
    });
    await flushPromises();

    expect(api.fetchShoppingLists).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Party");
    expect(wrapper.text()).not.toContain("Wocheneinkauf");
  });
});
