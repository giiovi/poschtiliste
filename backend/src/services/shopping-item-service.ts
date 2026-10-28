import type { Database } from "../db/database";
import type { PublicUser } from "../types/user";
import type { ShoppingItem } from "../types/shopping-item";

interface ShoppingItemRow extends Omit<ShoppingItem, "purchased"> {
  purchased: number | boolean;
}

export type ShoppingItemResult<T> =
  | { status: "ok"; value: T }
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "item-not-found" };
export interface ShoppingItemUpdate {
  name?: string;
  quantity?: number;
  purchased?: boolean;
}

export interface ShoppingItemService {
  listForUser(
    shoppingListId: number,
    user: PublicUser,
  ): Promise<ShoppingItemResult<ShoppingItem[]>>;
  createForUser(
    shoppingListId: number,
    name: string,
    quantity: number,
    user: PublicUser,
  ): Promise<ShoppingItemResult<ShoppingItem>>;
  updateForUser(
    shoppingListId: number,
    shoppingItemId: number,
    update: ShoppingItemUpdate,
    user: PublicUser,
  ): Promise<ShoppingItemResult<ShoppingItem>>;
  deleteForUser(
    shoppingListId: number,
    itemId: number,
    user: PublicUser,
  ): Promise<ShoppingItemResult<null>>;
}

const ITEM_COLUMNS =
  "id, shopping_list_id, name, quantity, purchased, created_at, updated_at";

function toShoppingItem(row: ShoppingItemRow): ShoppingItem {
  return { ...row, purchased: Boolean(row.purchased) };
}

async function checkListAccess(
  database: Database,
  shoppingListId: number,
  user: PublicUser,
): Promise<"allowed" | "forbidden" | "not-found"> {
  const lists = await database.all<{ id: number }>(
    "SELECT id FROM shopping_lists WHERE id = ?",
    [shoppingListId],
  );

  if (!lists[0]) {
    return "not-found";
  }

  if (user.role === "admin") {
    return "allowed";
  }

  const accessibleLists = await database.all<{ id: number }>(
    `SELECT DISTINCT shopping_lists.id
     FROM shopping_lists
     LEFT JOIN list_assignments
       ON list_assignments.shopping_list_id = shopping_lists.id
     WHERE shopping_lists.id = ?
       AND (shopping_lists.responsible_user_id = ? OR list_assignments.user_id = ?)`,
    [shoppingListId, user.id, user.id],
  );

  return accessibleLists[0] ? "allowed" : "forbidden";
}

export function createShoppingItemService(
  database: Database,
): ShoppingItemService {
  return {
    async listForUser(shoppingListId, user) {
      const access = await checkListAccess(database, shoppingListId, user);

      if (access !== "allowed") {
        return { status: access };
      }

      const rows = await database.all<ShoppingItemRow>(
        `SELECT ${ITEM_COLUMNS}
         FROM shopping_items
         WHERE shopping_list_id = ?
         ORDER BY id`,
        [shoppingListId],
      );

      return { status: "ok", value: rows.map(toShoppingItem) };
    },

    async createForUser(shoppingListId, name, quantity, user) {
      const access = await checkListAccess(database, shoppingListId, user);

      if (access !== "allowed") {
        return { status: access };
      }

      const rows = await database.all<ShoppingItemRow>(
        `INSERT INTO shopping_items (shopping_list_id, name, quantity)
         VALUES (?, ?, ?)
         RETURNING ${ITEM_COLUMNS}`,
        [shoppingListId, name, quantity],
      );

      return { status: "ok", value: toShoppingItem(rows[0]) };
    },

    async updateForUser(shoppingListId, shoppingItemId, update, user) {
      const access = await checkListAccess(database, shoppingListId, user);

      if (access !== "allowed") {
        return { status: access };
      }

      const rows = await database.all<ShoppingItemRow>(
        `UPDATE shopping_items
         SET name = COALESCE(?, name),
             quantity = COALESCE(?, quantity),
             purchased = COALESCE(?, purchased),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND shopping_list_id = ?
         RETURNING ${ITEM_COLUMNS}`,
        [
          update.name ?? null,
          update.quantity ?? null,
          update.purchased ?? null,
          shoppingItemId,
          shoppingListId,
        ],
      );

      if (!rows[0]) {
        return { status: "item-not-found" };
      }

      return { status: "ok", value: toShoppingItem(rows[0]) };
    },

    async deleteForUser(shoppingListId, itemId, user) {
      const access = await checkListAccess(database, shoppingListId, user);

      if (access !== "allowed") {
        return { status: access };
      }

      // the list id condition prevents deleting items of other lists
      const rows = await database.all<{ id: number }>(
        `DELETE FROM shopping_items
         WHERE id = ? AND shopping_list_id = ?
         RETURNING id`,
        [itemId, shoppingListId],
      );

      return rows[0]
        ? { status: "ok", value: null }
        : { status: "item-not-found" };
    },
  };
}
