import { Router, type Request, type RequestHandler } from "express";

import { asyncHandler } from "../middleware/async-handler";
import type { AuthService } from "../services/auth-service";
import { SESSION_COOKIE_NAME } from "../session";

interface LoginBody {
  username: string;
  password: string;
}

function isLoginBody(value: unknown): value is LoginBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const body = value as Record<string, unknown>;
  return (
    typeof body.username === "string" &&
    body.username.trim().length > 0 &&
    typeof body.password === "string" &&
    body.password.length > 0
  );
}

async function regenerateSession(request: Request): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    request.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function destroySession(request: Request): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    request.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function createAuthRouter(
  authService: AuthService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post(
    "/login",
    asyncHandler(async (request, response) => {
      const body: unknown = request.body;

      if (!isLoginBody(body)) {
        response.status(401).json({ error: "Invalid username or password" });
        return;
      }

      const user = await authService.authenticate(
        body.username.trim(),
        body.password,
      );

      if (!user) {
        response.status(401).json({ error: "Invalid username or password" });
        return;
      }

      await regenerateSession(request);
      request.session.userId = user.id;
      response.status(200).json({ user });
    }),
  );

  router.post(
    "/logout",
    asyncHandler(async (request, response) => {
      await destroySession(request);
      response.clearCookie(SESSION_COOKIE_NAME);
      response.status(204).end();
    }),
  );

  router.get("/me", requireAuth, (request, response) => {
    response.status(200).json({ user: request.currentUser });
  });

  return router;
}
