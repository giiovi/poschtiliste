import type { NextFunction, Request, Response } from "express";

import { requireAdmin } from "../src/middleware/require-admin";
import type { PublicUser } from "../src/types/user";

const baseUser = {
  id: 1,
  username: "alice",
  created_at: "2026-09-01 10:00:00",
  updated_at: "2026-09-01 10:00:00",
};

function createResponse(): Response & { statusCode: number; body: unknown } {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(body: unknown) {
      response.body = body;
      return response;
    },
  };

  return response as unknown as Response & {
    statusCode: number;
    body: unknown;
  };
}

function run(currentUser?: PublicUser): {
  response: ReturnType<typeof createResponse>;
  nextCalled: boolean;
} {
  const request = { currentUser } as Request;
  const response = createResponse();
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  requireAdmin(request, response, next);

  return { response, nextCalled };
}

describe("requireAdmin middleware", () => {
  test("rejects unauthenticated requests with 401", () => {
    const { response, nextCalled } = run();

    expect(nextCalled).toBe(false);
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
  });

  test("rejects authenticated non-admin users with 403", () => {
    const { response, nextCalled } = run({ ...baseUser, role: "user" });

    expect(nextCalled).toBe(false);
    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({
      error: "Administrator access required",
    });
  });

  test("allows authenticated administrators", () => {
    const { response, nextCalled } = run({ ...baseUser, role: "admin" });

    expect(nextCalled).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeUndefined();
  });
});
