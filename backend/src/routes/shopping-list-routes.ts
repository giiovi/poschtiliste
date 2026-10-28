import { Router, type RequestHandler } from "express";

import { ValidationError } from "../errors/http-error";
import { asyncHandler } from "../middleware/async-handler";
import type {
  ShoppingItemResult,
  ShoppingItemService,
} from "../services/shopping-item-service";
import type { ShoppingListService } from "../services/shopping-list-service";
import type { ShoppingItem } from "../types/shopping-item";
import type { PublicUser } from "../types/user";
import {
  validateShoppingListInput,
  validateShoppingListUpdate,
} from "../validation/shopping-list-validation";

interface CreateShoppingItemBody {
  name: string;
  quantity: number;
}

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

function parsePositiveId(value: string | string[]): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseCreateItemBody(value: unknown): CreateShoppingItemBody | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const quantity = body.quantity ?? 1;

  if (
    name.length === 0 ||
    name.length > 255 ||
    !Number.isSafeInteger(quantity) ||
    (quantity as number) <= 0
  ) {
    return null;
  }

  return { name, quantity: quantity as number };
}

function sendItemResult(
  result: ShoppingItemResult<ShoppingItem | ShoppingItem[]>,
  response: Parameters<RequestHandler>[1],
  successStatus = 200,
): void {
  if (result.status === "not-found") {
    response.status(404).json({ error: "Shopping list not found" });
    return;
  }

  if (result.status === "forbidden") {
    response.status(403).json({ error: "Shopping list access denied" });
    return;
  }

  response.status(successStatus).json(result.value);
}

export function createShoppingListRouter(
  shoppingListService: ShoppingListService,
  shoppingItemService: ShoppingItemService,
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

  router.get(
    "/:id/items",
    asyncHandler(async (request, response) => {
      const shoppingListId = parsePositiveId(request.params.id);

      if (shoppingListId === null) {
        response.status(400).json({ error: "Invalid shopping list id" });
        return;
      }

      const result = await shoppingItemService.listForUser(
        shoppingListId,
        request.currentUser as PublicUser,
      );

      sendItemResult(result, response);
    }),
  );

  router.post(
    "/:id/items",
    asyncHandler(async (request, response) => {
      const shoppingListId = parsePositiveId(request.params.id);
      const body = parseCreateItemBody(request.body);

      if (shoppingListId === null) {
        response.status(400).json({ error: "Invalid shopping list id" });
        return;
      }

      if (!body) {
        response.status(400).json({ error: "Invalid shopping item data" });
        return;
      }

      const result = await shoppingItemService.createForUser(
        shoppingListId,
        body.name,
        body.quantity,
        request.currentUser as PublicUser,
      );

      sendItemResult(result, response, 201);
    }),
  );

  return router;
}
