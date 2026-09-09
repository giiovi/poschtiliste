import type { Database } from "../db/database";
import type { ShoppingList } from "../types/shopping-list";
import type { PublicUser } from "../types/user";

export interface ShoppingListService {
  listForUser(user: PublicUser): Promise<ShoppingList[]>;
}

interface ShoppingListRow extends Omit<ShoppingList, "completed"> {
  completed: number | boolean;
}

const LIST_COLUMNS =
  "shopping_lists.id, shopping_lists.title, shopping_lists.due_date, shopping_lists.responsible_user_id, shopping_lists.completed, shopping_lists.created_at, shopping_lists.updated_at";

function toShoppingList(row: ShoppingListRow): ShoppingList {
  // sqlite stores booleans as integers
  return { ...row, completed: Boolean(row.completed) };
}

export function createShoppingListService(
  database: Database,
): ShoppingListService {
  return {
    async listForUser(user: PublicUser): Promise<ShoppingList[]> {
      const rows =
        user.role === "admin"
          ? await database.all<ShoppingListRow>(
              `SELECT ${LIST_COLUMNS} FROM shopping_lists ORDER BY shopping_lists.id`,
            )
          : await database.all<ShoppingListRow>(
              `SELECT DISTINCT ${LIST_COLUMNS}
               FROM shopping_lists
               LEFT JOIN list_assignments
                 ON list_assignments.shopping_list_id = shopping_lists.id
               WHERE list_assignments.user_id = ?
                  OR shopping_lists.responsible_user_id = ?
               ORDER BY shopping_lists.id`,
              [user.id, user.id],
            );

      return rows.map(toShoppingList);
    },
  };
}
