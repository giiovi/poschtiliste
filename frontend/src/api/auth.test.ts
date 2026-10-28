import { afterEach, describe, expect, test, vi } from "vitest";

import {
  fetchCurrentUser,
  InvalidCredentialsError,
  loginUser,
  logoutUser,
} from "./auth";

const user = { id: 1, username: "alice", role: "user" as const };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authentication api", () => {
  test("loads the current user from the existing session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCurrentUser()).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
  });

  test("treats a 401 from /me as no active session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(fetchCurrentUser()).resolves.toBeNull();
  });

  test("reports invalid login credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(loginUser("alice", "wrong")).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  test("logs out through the session endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await logoutUser();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
  });
});
