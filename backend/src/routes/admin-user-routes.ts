import { Router, type RequestHandler } from "express";

import { ValidationError } from "../errors/http-error";
import { asyncHandler } from "../middleware/async-handler";
import { requireAdmin } from "../middleware/require-admin";
import type { AdminUserService } from "../services/admin-user-service";
import type { PublicUser } from "../types/user";
import {
  validatePasswordReset,
  validateUserInput,
  validateUserUpdate,
} from "../validation/user-validation";

function parseUserId(value: string): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    throw new ValidationError("User id must be a positive integer");
  }

  return id;
}

export function createAdminUserRouter(
  adminUserService: AdminUserService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.use(requireAuth, requireAdmin);

  router.get(
    "/",
    asyncHandler(async (_request, response) => {
      response.json(await adminUserService.list());
    }),
  );

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const user = await adminUserService.create(
        validateUserInput(request.body),
      );

      response.status(201).json(user);
    }),
  );

  router.patch(
    "/:id",
    asyncHandler(async (request, response) => {
      const user = await adminUserService.update(
        parseUserId(request.params.id as string),
        validateUserUpdate(request.body),
        request.currentUser as PublicUser,
      );

      response.json(user);
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (request, response) => {
      await adminUserService.remove(
        parseUserId(request.params.id as string),
        request.currentUser as PublicUser,
      );

      response.status(204).end();
    }),
  );

  router.put(
    "/:id/password",
    asyncHandler(async (request, response) => {
      await adminUserService.resetPassword(
        parseUserId(request.params.id as string),
        validatePasswordReset(request.body),
      );

      response.status(204).end();
    }),
  );

  return router;
}
