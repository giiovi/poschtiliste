import { Router, type RequestHandler } from "express";

import { ValidationError } from "../errors/http-error";
import { asyncHandler } from "../middleware/async-handler";
import { RealtimeNotifier } from "../realtime/realtime-notifier";
import type {
  ShoppingItemResult,
  ShoppingItemService,
} from "../services/shopping-item-service";
import type { ShoppingListService } from "../services/shopping-list-service";
import type { ShoppingItem } from "../types/shopping-item";
import type { PublicUser } from "../types/user";
import {
  validateShoppingItemCreate,
  validateShoppingItemUpdate,
} from "../validation/shopping-item-validation";
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

function parsePositiveId(value: string | string[]): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function sendItemResult(
  result: ShoppingItemResult<ShoppingItem | ShoppingItem[] | null>,
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

  if (result.value === null) {
    response.status(204).end();
    return;
  }

  response.status(successStatus).json(result.value);
}

export function createShoppingListRouter(
  shoppingListService: ShoppingListService,
  shoppingItemService: ShoppingItemService,
  requireAuth: RequestHandler,
  realtimeNotifier = new RealtimeNotifier(),
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
      realtimeNotifier.notifyUsers(
        await shoppingListService.notificationRecipientIds(list.id),
        {
          name: "list:updated",
          payload: {
            listId: list.id,
            actorUserId: currentUser.id,
            change: "created",
          },
        },
      );

      response.status(201).json(list);
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (request, response) => {
      const list = await shoppingListService.findForUser(
        parseListId(request.params.id as string),
        request.currentUser as PublicUser,
      );

      response.json(list);
    }),
  );

  const updateList = asyncHandler(async (request, response) => {
    const listId = parseListId(request.params.id as string);
    const previousRecipients =
      await shoppingListService.notificationRecipientIds(listId);
    const currentUser = request.currentUser as PublicUser;
    const list = await shoppingListService.update(
      listId,
      validateShoppingListUpdate(request.body),
      currentUser,
    );
    realtimeNotifier.notifyUsers(
      [
        ...previousRecipients,
        ...(await shoppingListService.notificationRecipientIds(listId)),
      ],
      {
        name: "list:updated",
        payload: {
          listId,
          actorUserId: currentUser.id,
          change: "updated",
        },
      },
    );

    response.json(list);
  });

  router.patch("/:id", updateList);
  router.put("/:id", updateList);

  router.delete(
    "/:id",
    asyncHandler(async (request, response) => {
      const listId = parseListId(request.params.id as string);
      const recipientIds =
        await shoppingListService.notificationRecipientIds(listId);
      const currentUser = request.currentUser as PublicUser;
      await shoppingListService.remove(listId, currentUser);
      realtimeNotifier.notifyUsers(recipientIds, {
        name: "list:updated",
        payload: {
          listId,
          actorUserId: currentUser.id,
          change: "deleted",
        },
      });

      response.status(204).end();
    }),
  );

  router.post(
    "/:id/assignments",
    asyncHandler(async (request, response) => {
      const listId = parseListId(request.params.id as string);
      const assignedUserId = parseId(request.body?.userId, "User id");
      const currentUser = request.currentUser as PublicUser;
      const assignedUserIds = await shoppingListService.addAssignment(
        listId,
        assignedUserId,
        currentUser,
      );
      realtimeNotifier.notifyUsers(
        await shoppingListService.notificationRecipientIds(listId),
        {
          name: "list:assigned",
          payload: {
            listId,
            assignedUserId,
            actorUserId: currentUser.id,
          },
        },
      );

      response.status(201).json({ assigned_user_ids: assignedUserIds });
    }),
  );

  router.delete(
    "/:id/assignments/:userId",
    asyncHandler(async (request, response) => {
      const listId = parseListId(request.params.id as string);
      const removedUserId = parseId(request.params.userId, "User id");
      const currentUser = request.currentUser as PublicUser;
      const previousRecipients =
        await shoppingListService.notificationRecipientIds(listId);
      await shoppingListService.removeAssignment(
        listId,
        removedUserId,
        currentUser,
      );
      realtimeNotifier.notifyUsers(
        [
          ...previousRecipients,
          ...(await shoppingListService.notificationRecipientIds(listId)),
        ],
        {
          name: "list:updated",
          payload: {
            listId,
            actorUserId: currentUser.id,
            change: "assignment-removed",
          },
        },
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
      const body = validateShoppingItemCreate(request.body);

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

      if (result.status === "ok") {
        const currentUser = request.currentUser as PublicUser;
        realtimeNotifier.notifyUsers(
          await shoppingListService.notificationRecipientIds(shoppingListId),
          {
            name: "item:added",
            payload: {
              listId: shoppingListId,
              actorUserId: currentUser.id,
              item: result.value,
            },
          },
        );
      }

      sendItemResult(result, response, 201);
    }),
  );

  router.patch(
    "/:id/items/:itemId",
    asyncHandler(async (request, response) => {
      const shoppingListId = parsePositiveId(request.params.id);
      const shoppingItemId = parsePositiveId(request.params.itemId);
      const body = validateShoppingItemUpdate(request.body);

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

      if (result.status === "ok") {
        const currentUser = request.currentUser as PublicUser;
        realtimeNotifier.notifyUsers(
          await shoppingListService.notificationRecipientIds(shoppingListId),
          {
            name: "item:updated",
            payload: {
              listId: shoppingListId,
              actorUserId: currentUser.id,
              item: result.value,
            },
          },
        );
      }

      sendItemResult(result, response);
    }),
  );

  router.delete(
    "/:id/items/:itemId",
    asyncHandler(async (request, response) => {
      const shoppingListId = parsePositiveId(request.params.id);
      const itemId = parsePositiveId(request.params.itemId);

      if (shoppingListId === null) {
        response.status(400).json({ error: "Invalid shopping list id" });
        return;
      }

      if (itemId === null) {
        response.status(400).json({ error: "Invalid shopping item id" });
        return;
      }

      const result = await shoppingItemService.deleteForUser(
        shoppingListId,
        itemId,
        request.currentUser as PublicUser,
      );

      if (result.status === "ok") {
        const currentUser = request.currentUser as PublicUser;
        realtimeNotifier.notifyUsers(
          await shoppingListService.notificationRecipientIds(shoppingListId),
          {
            name: "item:deleted",
            payload: {
              listId: shoppingListId,
              actorUserId: currentUser.id,
              itemId,
            },
          },
        );
      }

      sendItemResult(result, response);
    }),
  );

  return router;
}
