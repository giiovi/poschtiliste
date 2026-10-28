import type {
  ShoppingItem,
  ShoppingItemInput,
  ShoppingItemUpdate,
} from "../types/shopping-item";
import { requestJson } from "./http";

export function fetchShoppingItems(listId: number): Promise<ShoppingItem[]> {
  return requestJson<ShoppingItem[]>(`/api/lists/${listId}/items`);
}

export function createShoppingItem(
  listId: number,
  input: ShoppingItemInput,
): Promise<ShoppingItem> {
  return requestJson<ShoppingItem>(`/api/lists/${listId}/items`, {
    method: "POST",
    body: input,
  });
}

export function updateShoppingItem(
  listId: number,
  itemId: number,
  update: ShoppingItemUpdate,
): Promise<ShoppingItem> {
  return requestJson<ShoppingItem>(`/api/lists/${listId}/items/${itemId}`, {
    method: "PATCH",
    body: update,
  });
}

export function deleteShoppingItem(
  listId: number,
  itemId: number,
): Promise<void> {
  return requestJson<void>(`/api/lists/${listId}/items/${itemId}`, {
    method: "DELETE",
  });
}
