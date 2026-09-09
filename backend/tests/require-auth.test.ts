import type { NextFunction, Request, Response } from "express";

import { createRequireAuth } from "../src/middleware/require-auth";
import type { UserService } from "../src/services/user-service";
import type { PublicUser } from "../src/types/user";

const alice: PublicUser = {
  id: 1,
  username: "alice",
  role: "user",
  created_at: "2026-09-01 10:00:00",
  updated_at: "2026-09-01 10:00:00",
};

function createUserService(users: PublicUser[]): UserService {
  return {
    async findById(id: number): Promise<PublicUser | null> {
      return users.find((user) => user.id === id) ?? null;
    },
  };
}

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

async function run(
  requireAuth: ReturnType<typeof createRequireAuth>,
  request: Request,
): Promise<{
  response: ReturnType<typeof createResponse>;
  nextCalled: boolean;
}> {
  const response = createResponse();
  let nextCalled = false;

  await new Promise<void>((resolve) => {
    const next: NextFunction = () => {
      nextCalled = true;
      resolve();
    };
    const originalJson = response.json.bind(response);
    response.json = (body: unknown) => {
      originalJson(body);
      resolve();
      return response;
    };

    requireAuth(request, response, next);
  });

  return { response, nextCalled };
}

describe("requireAuth middleware", () => {
  const requireAuth = createRequireAuth(createUserService([alice]));

  test("rejects requests without a session user with 401", async () => {
    const { response, nextCalled } = await run(requireAuth, {
      session: {},
    } as unknown as Request);

    expect(nextCalled).toBe(false);
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
  });

  test("rejects sessions of deleted users with 401", async () => {
    const { response, nextCalled } = await run(requireAuth, {
      session: { userId: 9999 },
    } as unknown as Request);

    expect(nextCalled).toBe(false);
    expect(response.statusCode).toBe(401);
  });

  test("attaches the current user and continues", async () => {
    const request = { session: { userId: alice.id } } as unknown as Request;
    const { nextCalled } = await run(requireAuth, request);

    expect(nextCalled).toBe(true);
    expect(request.currentUser).toEqual(alice);
  });
});
