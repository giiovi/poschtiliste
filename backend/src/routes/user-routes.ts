import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../middleware/async-handler";
import type { UserService } from "../services/user-service";

export function createUserRouter(
  userService: UserService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.use(requireAuth);

  // selectable users for responsible and assigned users of a list
  router.get(
    "/",
    asyncHandler(async (_request, response) => {
      response.json(await userService.listOptions());
    }),
  );

  return router;
}
