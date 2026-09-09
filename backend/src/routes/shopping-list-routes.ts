import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../middleware/async-handler";
import type { ShoppingListService } from "../services/shopping-list-service";
import type { PublicUser } from "../types/user";
import { ValidationError } from "../errors/http-error";
import {
  validateShoppingListInput,
  validateShoppingListUpdate,
} from "../validation/shopping-list-validation";

function parseListId(value: string): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    throw new ValidationError("List id must be a positive integer");
  }

  return id;
}

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

  const updateList = asyncHandler(async (request, response) => {
    const list = await shoppingListService.update(
      parseListId(request.params.id as string),
      validateShoppingListUpdate(request.body),
      request.currentUser as PublicUser,
    );

    response.json(list);
  });

  router.patch("/:id", updateList);
  router.put("/:id", updateList);

  return router;
}
