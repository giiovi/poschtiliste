import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError } from "../api/http";
import type { ShoppingListDetail } from "../types/shopping-list";
import ShoppingListForm from "./ShoppingListForm.vue";

const api = vi.hoisted(() => ({
  createShoppingList: vi.fn(),
  fetchShoppingList: vi.fn(),
  updateShoppingList: vi.fn(),
  fetchUsers: vi.fn(),
}));

vi.mock("../api/shopping-lists", async () => ({
  ...(await vi.importActual<object>("../api/http")),
  createShoppingList: api.createShoppingList,
  fetchShoppingList: api.fetchShoppingList,
  updateShoppingList: api.updateShoppingList,
}));

vi.mock("../api/users", () => ({ fetchUsers: api.fetchUsers }));

const users = [
  { id: 1, username: "admin" },
  { id: 2, username: "alice" },
  { id: 3, username: "bob" },
];

const existingList: ShoppingListDetail = {
  id: 7,
  title: "Wocheneinkauf",
  due_date: "2026-11-02",
  responsible_user_id: 2,
  completed: false,
  created_at: "2026-10-28 09:00:00",
  updated_at: "2026-10-28 09:00:00",
  assigned_user_ids: [3],
};

async function mountForm(listId?: number) {
  const wrapper = mount(ShoppingListForm, {
    props: { listId, currentUserId: 2 },
  });
  await flushPromises();
  return wrapper;
}

describe("ShoppingListForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.fetchUsers.mockResolvedValue(users);
  });

  test("creates a list with responsible and assigned users", async () => {
    api.createShoppingList.mockResolvedValue({ ...existingList, id: 8 });
    const wrapper = await mountForm();

    await wrapper.get('input[name="title"]').setValue("Party");
    await wrapper.get('input[name="dueDate"]').setValue("2026-12-24");
    await wrapper.get('select[name="responsibleUserId"]').setValue("3");
    await wrapper.get('input[type="checkbox"][value="1"]').setValue(true);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(api.createShoppingList).toHaveBeenCalledWith({
      title: "Party",
      dueDate: "2026-12-24",
      responsibleUserId: 3,
      assignedUserIds: [1],
    });
    expect(wrapper.emitted("saved")).toHaveLength(1);
  });

  test("defaults the responsible user to the current user", async () => {
    const wrapper = await mountForm();

    expect(
      (
        wrapper.get('select[name="responsibleUserId"]')
          .element as HTMLSelectElement
      ).value,
    ).toBe("2");
  });

  test("shows backend validation errors at the matching field", async () => {
    api.createShoppingList.mockRejectedValue(
      new ApiError(400, "Title is required"),
    );
    const wrapper = await mountForm();

    await wrapper.get('input[name="title"]').setValue("   ");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get("#title-error").text()).toBe("Title is required");
    expect(wrapper.get('input[name="title"]').attributes("aria-invalid")).toBe(
      "true",
    );
    expect(wrapper.emitted("saved")).toBeUndefined();
  });

  test("loads an existing list and saves the changes", async () => {
    api.fetchShoppingList.mockResolvedValue(existingList);
    api.updateShoppingList.mockResolvedValue(undefined);
    const wrapper = await mountForm(7);

    expect(api.fetchShoppingList).toHaveBeenCalledWith(7);
    expect(
      (wrapper.get('input[name="title"]').element as HTMLInputElement).value,
    ).toBe("Wocheneinkauf");

    await wrapper.get('input[type="checkbox"][value="3"]').setValue(false);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(api.updateShoppingList).toHaveBeenCalledWith(existingList, {
      title: "Wocheneinkauf",
      dueDate: "2026-11-02",
      responsibleUserId: 2,
      assignedUserIds: [],
    });
    expect(wrapper.emitted("saved")).toHaveLength(1);
  });

  test("reloads the list after a failed update before the next attempt", async () => {
    const partlySavedList = { ...existingList, title: "Party" };
    api.fetchShoppingList
      .mockResolvedValueOnce(existingList)
      .mockResolvedValueOnce(partlySavedList);
    api.updateShoppingList
      .mockRejectedValueOnce(new ApiError(500, "Internal server error"))
      .mockResolvedValueOnce(undefined);
    const wrapper = await mountForm(7);

    await wrapper.get('input[name="title"]').setValue("Party");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain("nicht gespeichert");

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(api.updateShoppingList).toHaveBeenLastCalledWith(
      partlySavedList,
      expect.objectContaining({ title: "Party" }),
    );
    expect(wrapper.emitted("saved")).toHaveLength(1);
  });

  test("shows a notice when the list is not accessible", async () => {
    api.fetchShoppingList.mockRejectedValue(
      new ApiError(404, "Shopping list not found"),
    );
    const wrapper = await mountForm(99);

    expect(wrapper.find("form").exists()).toBe(false);
    expect(wrapper.text()).toContain("keinen Zugriff");
  });
});
