import { createMemoryHistory } from "vue-router";
import { describe, expect, test, vi } from "vitest";

import { createAuthSession } from "./auth/session";
import { createAppRouter } from "./router";
import type { User } from "./types/user";

const user: User = { id: 1, username: "alice", role: "user" };

function createSession(currentUser: User | null) {
  return createAuthSession({
    fetchCurrentUser: vi.fn().mockResolvedValue(currentUser),
    loginUser: vi.fn().mockResolvedValue(user),
    logoutUser: vi.fn().mockResolvedValue(undefined),
  });
}

describe("authentication route guard", () => {
  test("redirects unauthenticated users to login", async () => {
    const router = createAppRouter(createSession(null), createMemoryHistory());

    await router.push("/");

    expect(router.currentRoute.value.name).toBe("login");
  });

  test("restores the session before opening a protected route", async () => {
    const session = createSession(user);
    const router = createAppRouter(session, createMemoryHistory());

    await router.push("/");

    expect(session.currentUser.value).toEqual(user);
    expect(router.currentRoute.value.name).toBe("dashboard");
  });

  test("protects the list form and keeps the target as redirect", async () => {
    const router = createAppRouter(createSession(null), createMemoryHistory());

    await router.push("/lists/7/edit");

    expect(router.currentRoute.value.name).toBe("login");
    expect(router.currentRoute.value.query.redirect).toBe("/lists/7/edit");
  });

  test("protects the shopping-list detail route", async () => {
    const router = createAppRouter(createSession(null), createMemoryHistory());

    await router.push("/lists/7");

    expect(router.currentRoute.value.name).toBe("login");
    expect(router.currentRoute.value.query.redirect).toBe("/lists/7");
  });

  test("opens the create and edit routes for authenticated users", async () => {
    const router = createAppRouter(createSession(user), createMemoryHistory());

    await router.push("/lists/new");
    expect(router.currentRoute.value.name).toBe("list-create");

    await router.push("/lists/7/edit");
    expect(router.currentRoute.value.name).toBe("list-edit");
    expect(router.currentRoute.value.params.id).toBe("7");

    await router.push("/lists/7");
    expect(router.currentRoute.value.name).toBe("list-detail");
    expect(router.currentRoute.value.params.id).toBe("7");
  });

  test("redirects authenticated users away from the login page", async () => {
    const router = createAppRouter(createSession(user), createMemoryHistory());

    await router.push("/login");

    expect(router.currentRoute.value.name).toBe("dashboard");
  });
});
