import type { PublicUser } from "../types/user";

export function hasShoppingListAccess(
  user: PublicUser,
  responsibleUserId: number,
  isAssigned: boolean,
): boolean {
  if (user.role === "admin") {
    return true;
  }

  if (responsibleUserId === user.id) {
    return true;
  }

  return isAssigned;
}
