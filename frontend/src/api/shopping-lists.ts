import type {
  ShoppingList,
  ShoppingListDetail,
  ShoppingListInput,
} from "../types/shopping-list";
import { requestJson } from "./http";

export { ApiError, UnauthenticatedError } from "./http";

export function fetchShoppingLists(): Promise<ShoppingList[]> {
  return requestJson<ShoppingList[]>("/api/lists");
}

export function fetchShoppingList(id: number): Promise<ShoppingListDetail> {
  return requestJson<ShoppingListDetail>(`/api/lists/${id}`);
}

export function createShoppingList(
  input: ShoppingListInput,
): Promise<ShoppingListDetail> {
  return requestJson<ShoppingListDetail>("/api/lists", {
    method: "POST",
    body: input,
  });
}

function patchShoppingList(
  id: number,
  update: Partial<Omit<ShoppingListInput, "assignedUserIds">>,
): Promise<ShoppingList> {
  return requestJson<ShoppingList>(`/api/lists/${id}`, {
    method: "PATCH",
    body: update,
  });
}

function addListAssignment(id: number, userId: number): Promise<unknown> {
  return requestJson(`/api/lists/${id}/assignments`, {
    method: "POST",
    body: { userId },
  });
}

function removeListAssignment(id: number, userId: number): Promise<unknown> {
  return requestJson(`/api/lists/${id}/assignments/${userId}`, {
    method: "DELETE",
  });
}

export async function updateShoppingList(
  existing: ShoppingListDetail,
  input: ShoppingListInput,
): Promise<void> {
  // title and date first, so validation errors stop before anything else changes
  await patchShoppingList(existing.id, {
    title: input.title,
    dueDate: input.dueDate,
  });

  for (const userId of input.assignedUserIds) {
    if (!existing.assigned_user_ids.includes(userId)) {
      await addListAssignment(existing.id, userId);
    }
  }

  // responsible change and removals last, the current user may lose access with them
  if (input.responsibleUserId !== existing.responsible_user_id) {
    await patchShoppingList(existing.id, {
      responsibleUserId: input.responsibleUserId,
    });
  }

  for (const userId of existing.assigned_user_ids) {
    if (!input.assignedUserIds.includes(userId)) {
      await removeListAssignment(existing.id, userId);
    }
  }
}
