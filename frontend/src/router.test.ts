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

  test("redirects authenticated users away from the login page", async () => {
    const router = createAppRouter(createSession(user), createMemoryHistory());

    await router.push("/login");

    expect(router.currentRoute.value.name).toBe("dashboard");
  });
});
