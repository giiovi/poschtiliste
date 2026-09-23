import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../middleware/async-handler";
import type { ShoppingListService } from "../services/shopping-list-service";
import type { PublicUser } from "../types/user";

interface CreateShoppingListBody {
  title: string;
  dueDate: string | null;
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

  return router;
}
