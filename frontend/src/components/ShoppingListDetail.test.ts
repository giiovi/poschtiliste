import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ShoppingItem } from "../types/shopping-item";
import type { ShoppingListDetail as ShoppingListDetailType } from "../types/shopping-list";
import ShoppingListDetail from "./ShoppingListDetail.vue";

const api = vi.hoisted(() => ({
  fetchShoppingList: vi.fn(),
  fetchShoppingItems: vi.fn(),
  createShoppingItem: vi.fn(),
  updateShoppingItem: vi.fn(),
  deleteShoppingItem: vi.fn(),
}));

vi.mock("../api/shopping-lists", () => ({
  fetchShoppingList: api.fetchShoppingList,
}));

vi.mock("../api/shopping-items", () => ({
  fetchShoppingItems: api.fetchShoppingItems,
  createShoppingItem: api.createShoppingItem,
  updateShoppingItem: api.updateShoppingItem,
  deleteShoppingItem: api.deleteShoppingItem,
}));

const list: ShoppingListDetailType = {
  id: 7,
  title: "Wocheneinkauf",
  due_date: "2026-11-02",
  responsible_user_id: 2,
  completed: false,
  created_at: "2026-10-28 09:00:00",
  updated_at: "2026-10-28 09:00:00",
  assigned_user_ids: [3],
};

const milk: ShoppingItem = {
  id: 4,
  shopping_list_id: 7,
  name: "Milk",
  quantity: 2,
  purchased: false,
  created_at: "2026-10-28 09:00:00",
  updated_at: "2026-10-28 09:00:00",
};

const bread: ShoppingItem = {
  ...milk,
  id: 5,
  name: "Bread",
  quantity: 1,
  purchased: true,
};

async function mountDetail() {
  const wrapper = mount(ShoppingListDetail, {
    props: { listId: 7 },
    global: { stubs: { RouterLink: true } },
  });
  await flushPromises();
  return wrapper;
}

describe("ShoppingListDetail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    api.fetchShoppingList.mockResolvedValue(list);
    api.fetchShoppingItems.mockResolvedValue([milk, bread]);
  });

  test("shows all items and their purchased state", async () => {
    const wrapper = await mountDetail();

    expect(wrapper.get("h2").text()).toBe("Wocheneinkauf");
    expect(wrapper.text()).toContain("1 von 2 Artikeln eingekauft");
    expect(wrapper.get('[data-testid="item-4"]').text()).toContain("Milk");
    expect(wrapper.get('[data-testid="item-5"]').classes()).toContain(
      "item-row--purchased",
    );
  });

  test("adds an item without reloading the list", async () => {
    const apples: ShoppingItem = {
      ...milk,
      id: 6,
      name: "Apples",
      quantity: 4,
    };
    api.createShoppingItem.mockResolvedValue(apples);
    const wrapper = await mountDetail();

    await wrapper.get('input[name="newItemName"]').setValue("Apples");
    await wrapper.get('input[name="newItemQuantity"]').setValue(4);
    await wrapper.get("form.add-item").trigger("submit");
    await flushPromises();

    expect(api.createShoppingItem).toHaveBeenCalledWith(7, {
      name: "Apples",
      quantity: 4,
    });
    expect(wrapper.get('[data-testid="item-6"]').text()).toContain("Apples");
    expect(api.fetchShoppingItems).toHaveBeenCalledTimes(1);
  });

  test("updates the purchased state without reloading", async () => {
    api.updateShoppingItem.mockResolvedValue({ ...milk, purchased: true });
    const wrapper = await mountDetail();

    await wrapper
      .get('[data-testid="item-4"] input[type="checkbox"]')
      .setValue(true);
    await flushPromises();

    expect(api.updateShoppingItem).toHaveBeenCalledWith(7, 4, {
      purchased: true,
    });
    expect(wrapper.get('[data-testid="item-4"]').classes()).toContain(
      "item-row--purchased",
    );
    expect(api.fetchShoppingItems).toHaveBeenCalledTimes(1);
  });

  test("edits an item's name and quantity inline", async () => {
    api.updateShoppingItem.mockResolvedValue({
      ...milk,
      name: "Oat milk",
      quantity: 3,
    });
    const wrapper = await mountDetail();
    const row = wrapper.get('[data-testid="item-4"]');

    await row.get('button[aria-label="Milk bearbeiten"]').trigger("click");
    await row.get('input[name="editItemName"]').setValue("Oat milk");
    await row.get('input[name="editItemQuantity"]').setValue(3);
    await row.get("form.item-edit").trigger("submit");
    await flushPromises();

    expect(api.updateShoppingItem).toHaveBeenCalledWith(7, 4, {
      name: "Oat milk",
      quantity: 3,
    });
    expect(wrapper.get('[data-testid="item-4"]').text()).toContain("Oat milk");
  });

  test("deletes a confirmed item without reloading", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.deleteShoppingItem.mockResolvedValue(undefined);
    const wrapper = await mountDetail();

    await wrapper
      .get('[data-testid="item-4"] button[aria-label="Milk löschen"]')
      .trigger("click");
    await flushPromises();

    expect(api.deleteShoppingItem).toHaveBeenCalledWith(7, 4);
    expect(wrapper.find('[data-testid="item-4"]').exists()).toBe(false);
    expect(api.fetchShoppingItems).toHaveBeenCalledTimes(1);
  });
});
