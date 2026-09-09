import type { Knex } from "knex";

import type { Database } from "../db/database";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../errors/http-error";
import type { ShoppingList } from "../types/shopping-list";
import type { PublicUser } from "../types/user";
import type {
  ShoppingListInput,
  ShoppingListUpdate,
} from "../validation/shopping-list-validation";

export interface ShoppingListWithAssignments extends ShoppingList {
  assigned_user_ids: number[];
}

export interface ShoppingListService {
  listForUser(user: PublicUser): Promise<ShoppingList[]>;
  create(input: ShoppingListInput): Promise<ShoppingListWithAssignments>;
  update(
    id: number,
    update: ShoppingListUpdate,
    user: PublicUser,
  ): Promise<ShoppingList>;
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

async function assertUsersExist(
  transaction: Knex.Transaction,
  userIds: number[],
): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  const rows: { id: number }[] = await transaction("users")
    .select("id")
    .whereIn("id", userIds);
  const existingIds = new Set(rows.map((row) => row.id));
  const missingIds = userIds.filter((userId) => !existingIds.has(userId));

  if (missingIds.length > 0) {
    throw new ValidationError(
      `Unknown user id(s): ${missingIds.sort((a, b) => a - b).join(", ")}`,
    );
  }
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

    async create(
      input: ShoppingListInput,
    ): Promise<ShoppingListWithAssignments> {
      return database.connection.transaction(async (transaction) => {
        const referencedUserIds = [
          ...new Set([input.responsibleUserId, ...input.assignedUserIds]),
        ];
        await assertUsersExist(transaction, referencedUserIds);

        const [listId] = await transaction("shopping_lists").insert({
          title: input.title,
          due_date: input.dueDate,
          responsible_user_id: input.responsibleUserId,
        });

        if (input.assignedUserIds.length > 0) {
          await transaction("list_assignments").insert(
            input.assignedUserIds.map((userId) => ({
              shopping_list_id: listId,
              user_id: userId,
            })),
          );
        }

        const [row]: ShoppingListRow[] = await transaction("shopping_lists")
          .select("*")
          .where("id", listId);

        return {
          ...toShoppingList(row),
          assigned_user_ids: input.assignedUserIds,
        };
      });
    },

    async update(
      id: number,
      update: ShoppingListUpdate,
      user: PublicUser,
    ): Promise<ShoppingList> {
      return database.connection.transaction(async (transaction) => {
        const [row]: ShoppingListRow[] = await transaction("shopping_lists")
          .select("*")
          .where("id", id);

        if (!row) {
          throw new NotFoundError("Shopping list not found");
        }

        if (user.role !== "admin" && row.responsible_user_id !== user.id) {
          const assignment = await transaction("list_assignments")
            .where({ shopping_list_id: id, user_id: user.id })
            .first();

          if (!assignment) {
            throw new ForbiddenError("No access to this shopping list");
          }
        }

        if (update.responsibleUserId !== undefined) {
          await assertUsersExist(transaction, [update.responsibleUserId]);
        }

        await transaction("shopping_lists")
          .where("id", id)
          .update({
            ...(update.title !== undefined && { title: update.title }),
            ...(update.dueDate !== undefined && { due_date: update.dueDate }),
            ...(update.responsibleUserId !== undefined && {
              responsible_user_id: update.responsibleUserId,
            }),
            ...(update.completed !== undefined && {
              completed: update.completed,
            }),
            updated_at: transaction.fn.now(),
          });

        const [updated]: ShoppingListRow[] = await transaction("shopping_lists")
          .select("*")
          .where("id", id);

        return toShoppingList(updated);
      });
    },
  };
}
