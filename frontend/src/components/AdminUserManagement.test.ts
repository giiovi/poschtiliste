import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError, UnauthenticatedError } from "../api/http";
import type { AdminUser } from "../types/user";
import AdminUserManagement from "./AdminUserManagement.vue";

const api = vi.hoisted(() => ({
  fetchAdminUsers: vi.fn(),
  createAdminUser: vi.fn(),
  updateAdminUser: vi.fn(),
  deleteAdminUser: vi.fn(),
  resetAdminUserPassword: vi.fn(),
}));

vi.mock("../api/admin-users", async () => ({
  ...(await vi.importActual<object>("../api/admin-users")),
  ...api,
}));

function adminUser(id: number, username: string, role = "user"): AdminUser {
  return {
    id,
    username,
    role: role as AdminUser["role"],
    created_at: "2026-10-28 09:00:00",
    updated_at: "2026-10-28 09:00:00",
  };
}

const users = [adminUser(1, "admin", "admin"), adminUser(2, "alice")];

async function mountManagement() {
  const wrapper = mount(AdminUserManagement, { props: { currentUserId: 1 } });
  await flushPromises();
  return wrapper;
}

async function clickButton(
  wrapper: Awaited<ReturnType<typeof mountManagement>>,
  rowIndex: number,
  text: string,
) {
  const row = wrapper.findAll(".user-row")[rowIndex];
  const button = row.findAll("button").find((item) => item.text() === text);
  await button?.trigger("click");
  return row;
}

describe("AdminUserManagement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.fetchAdminUsers.mockResolvedValue(users);
  });

  test("lists users and hides delete for the own account", async () => {
    const wrapper = await mountManagement();
    const rows = wrapper.findAll(".user-row");

    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain("(du)");
    expect(rows[0].text()).not.toContain("Löschen");
    expect(rows[1].text()).toContain("Löschen");
  });

  test("creates a user and adds it to the list", async () => {
    api.createAdminUser.mockResolvedValue(adminUser(3, "bob"));
    const wrapper = await mountManagement();

    const form = wrapper.get(".admin-users__create");
    await form.get('input[name="username"]').setValue("bob");
    await form.get('input[name="password"]').setValue("bob12345");
    await form.trigger("submit");
    await flushPromises();

    expect(api.createAdminUser).toHaveBeenCalledWith({
      username: "bob",
      password: "bob12345",
      role: "user",
    });
    expect(wrapper.findAll(".user-row")).toHaveLength(3);
  });

  test("shows backend errors in german", async () => {
    api.createAdminUser.mockRejectedValue(
      new ApiError(409, "Username is already taken"),
    );
    const wrapper = await mountManagement();

    await wrapper.get(".admin-users__create").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe(
      "Dieser Benutzername ist bereits vergeben.",
    );
  });

  test("edits, resets the password and deletes a user", async () => {
    api.updateAdminUser.mockResolvedValue({ ...users[1], role: "admin" });
    api.resetAdminUserPassword.mockResolvedValue(undefined);
    api.deleteAdminUser.mockResolvedValue(undefined);
    const wrapper = await mountManagement();

    let row = await clickButton(wrapper, 1, "Bearbeiten");
    await row.get('select[name="role"]').setValue("admin");
    await row.get("form").trigger("submit");
    await flushPromises();
    expect(api.updateAdminUser).toHaveBeenCalledWith(2, {
      username: "alice",
      role: "admin",
    });
    expect(wrapper.findAll(".user-row")[1].text()).toContain("Admin");

    row = await clickButton(wrapper, 1, "Passwort zurücksetzen");
    await row.get('input[name="password"]').setValue("neues12345");
    await row.get("form").trigger("submit");
    await flushPromises();
    expect(api.resetAdminUserPassword).toHaveBeenCalledWith(2, "neues12345");

    await clickButton(wrapper, 1, "Löschen");
    await clickButton(wrapper, 1, "Endgültig löschen");
    await flushPromises();
    expect(api.deleteAdminUser).toHaveBeenCalledWith(2);
    expect(wrapper.findAll(".user-row")).toHaveLength(1);
  });

  test("keeps the row when deleting fails", async () => {
    api.deleteAdminUser.mockRejectedValue(
      new ApiError(409, "User is still responsible for shopping lists"),
    );
    const wrapper = await mountManagement();

    await clickButton(wrapper, 1, "Löschen");
    await clickButton(wrapper, 1, "Endgültig löschen");
    await flushPromises();

    expect(wrapper.findAll(".user-row")).toHaveLength(2);
    expect(wrapper.get('[role="alert"]').text()).toContain(
      "für Einkaufslisten verantwortlich",
    );
  });

  test("emits unauthenticated when the session expired", async () => {
    api.fetchAdminUsers.mockRejectedValue(new UnauthenticatedError());
    const wrapper = await mountManagement();

    expect(wrapper.emitted("unauthenticated")).toHaveLength(1);
  });
});
