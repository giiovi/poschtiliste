import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../middleware/async-handler";
import type { ShoppingListService } from "../services/shopping-list-service";
import type { PublicUser } from "../types/user";
import { validateShoppingListInput } from "../validation/shopping-list-validation";

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

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const currentUser = request.currentUser as PublicUser;
      const input = validateShoppingListInput(request.body, currentUser.id);
      const list = await shoppingListService.create(input);

      response.status(201).json(list);
    }),
  );

  return router;
}
