import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../middleware/async-handler";
import type { ShoppingListService } from "../services/shopping-list-service";
import type { PublicUser } from "../types/user";

export function createShoppingListRouter(
  shoppingListService: ShoppingListService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const lists = await shoppingListService.listForUser(
        request.currentUser as PublicUser,
      );

      response.json(lists);
    }),
  );

  return router;
}
