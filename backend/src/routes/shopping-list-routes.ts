import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../middleware/async-handler";
import type { ShoppingListService } from "../services/shopping-list-service";
import type { PublicUser } from "../types/user";
import { ValidationError } from "../errors/http-error";
import {
  validateShoppingListInput,
  validateShoppingListUpdate,
} from "../validation/shopping-list-validation";

function parseId(value: unknown, name: string): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    throw new ValidationError(`${name} must be a positive integer`);
  }

  return id;
}

function parseListId(value: string): number {
  return parseId(value, "List id");
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

  router.delete(
    "/:id",
    asyncHandler(async (request, response) => {
      await shoppingListService.remove(
        parseListId(request.params.id as string),
        request.currentUser as PublicUser,
      );

      response.status(204).end();
    }),
  );

  router.post(
    "/:id/assignments",
    asyncHandler(async (request, response) => {
      const assignedUserIds = await shoppingListService.addAssignment(
        parseListId(request.params.id as string),
        parseId(request.body?.userId, "User id"),
        request.currentUser as PublicUser,
      );

      response.status(201).json({ assigned_user_ids: assignedUserIds });
    }),
  );

  router.delete(
    "/:id/assignments/:userId",
    asyncHandler(async (request, response) => {
      await shoppingListService.removeAssignment(
        parseListId(request.params.id as string),
        parseId(request.params.userId, "User id"),
        request.currentUser as PublicUser,
      );

      response.status(204).end();
    }),
  );

  return router;
}
