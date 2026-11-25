import { afterEach, describe, expect, test, vi } from "vitest";

import type { User } from "../types/user";
import { OFFLINE_API_CACHE } from "../offline/offline-cache";
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

  describe("offline cache", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    function stubCaches() {
      const cacheStorage = { delete: vi.fn().mockResolvedValue(true) };
      vi.stubGlobal("caches", cacheStorage);
      return cacheStorage;
    }

    test("is removed after login and logout", async () => {
      const cacheStorage = stubCaches();
      const session = createAuthSession(createApi());

      await session.login("alice", "correct-password");
      await session.logout();

      expect(cacheStorage.delete).toHaveBeenCalledTimes(2);
      expect(cacheStorage.delete).toHaveBeenCalledWith(OFFLINE_API_CACHE);
    });

    test("is removed when no session exists", async () => {
      const cacheStorage = stubCaches();
      const session = createAuthSession(createApi(null));

      await session.initialize();

      expect(cacheStorage.delete).toHaveBeenCalledWith(OFFLINE_API_CACHE);
    });

    test("is kept when an existing session is restored", async () => {
      const cacheStorage = stubCaches();
      const session = createAuthSession(createApi(user));

      await session.initialize();

      expect(cacheStorage.delete).not.toHaveBeenCalled();
    });
  });
});
