import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../middleware/async-handler";
import type {
  ShoppingItemResult,
  ShoppingItemService,
} from "../services/shopping-item-service";
import type { ShoppingListService } from "../services/shopping-list-service";
import type { ShoppingItem } from "../types/shopping-item";
import type { PublicUser } from "../types/user";

interface CreateShoppingListBody {
  title: string;
  dueDate: string | null;
}

interface CreateShoppingItemBody {
  name: string;
  quantity: number;
}

interface UpdateShoppingItemBody {
  name?: string;
  quantity?: number;
  purchased?: boolean;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function parseCreateBody(value: unknown): CreateShoppingListBody | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const body = value as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const dueDate = body.dueDate;

  if (title.length === 0 || title.length > 255) {
    return null;
  }

  if (
    dueDate !== undefined &&
    dueDate !== null &&
    typeof dueDate !== "string"
  ) {
    return null;
  }

  if (typeof dueDate === "string" && !isIsoDate(dueDate)) {
    return null;
  }

  return { title, dueDate: dueDate ?? null };
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

function parseUpdateItemBody(value: unknown): UpdateShoppingItemBody | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const body = value as Record<string, unknown>;
  const update: UpdateShoppingItemBody = {};

  if ("name" in body) {
    if (typeof body.name !== "string") {
      return null;
    }

    const name = body.name.trim();
    if (name.length === 0 || name.length > 255) {
      return null;
    }
    update.name = name;
  }

  if ("quantity" in body) {
    if (
      !Number.isSafeInteger(body.quantity) ||
      (body.quantity as number) <= 0
    ) {
      return null;
    }
    update.quantity = body.quantity as number;
  }

  if ("purchased" in body) {
    if (typeof body.purchased !== "boolean") {
      return null;
    }
    update.purchased = body.purchased;
  }

  return Object.keys(update).length > 0 ? update : null;
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

  if (result.status === "item-not-found") {
    response.status(404).json({ error: "Shopping item not found" });
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
      const body = parseCreateBody(request.body);

      if (!body) {
        response.status(400).json({ error: "Invalid shopping list data" });
        return;
      }

      const list = await shoppingListService.createForUser(
        body.title,
        body.dueDate,
        (request.currentUser as PublicUser).id,
      );

      response.status(201).json(list);
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

  router.patch(
    "/:id/items/:itemId",
    asyncHandler(async (request, response) => {
      const shoppingListId = parsePositiveId(request.params.id);
      const shoppingItemId = parsePositiveId(request.params.itemId);
      const body = parseUpdateItemBody(request.body);

      if (shoppingListId === null) {
        response.status(400).json({ error: "Invalid shopping list id" });
        return;
      }

      if (shoppingItemId === null) {
        response.status(400).json({ error: "Invalid shopping item id" });
        return;
      }

      if (!body) {
        response.status(400).json({ error: "Invalid shopping item data" });
        return;
      }

      const result = await shoppingItemService.updateForUser(
        shoppingListId,
        shoppingItemId,
        body,
        request.currentUser as PublicUser,
      );

      sendItemResult(result, response);
    }),
  );

  return router;
}
