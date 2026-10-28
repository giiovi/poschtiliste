import { describe, expect, test, vi } from "vitest";

import type { User } from "../types/user";
import { createAuthSession } from "./session";

const user: User = { id: 1, username: "alice", role: "user" };

function createApi(currentUser: User | null = null) {
  return {
    fetchCurrentUser: vi.fn().mockResolvedValue(currentUser),
    loginUser: vi.fn().mockResolvedValue(user),
    logoutUser: vi.fn().mockResolvedValue(undefined),
  };
}

describe("auth session", () => {
  test("restores an existing session only once", async () => {
    const api = createApi(user);
    const session = createAuthSession(api);

    await session.initialize();
    await session.initialize();

    expect(api.fetchCurrentUser).toHaveBeenCalledTimes(1);
    expect(session.state.value).toBe("authenticated");
    expect(session.currentUser.value).toEqual(user);
  });

  test("stores the user after login", async () => {
    const api = createApi();
    const session = createAuthSession(api);

    await session.login("alice", "correct-password");

    expect(api.loginUser).toHaveBeenCalledWith("alice", "correct-password");
    expect(session.currentUser.value).toEqual(user);
  });

  test("clears the user after logout", async () => {
    const api = createApi(user);
    const session = createAuthSession(api);
    await session.initialize();

    await session.logout();

    expect(api.logoutUser).toHaveBeenCalledOnce();
    expect(session.state.value).toBe("unauthenticated");
    expect(session.currentUser.value).toBeNull();
  });
});
