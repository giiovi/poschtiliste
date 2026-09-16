import type { ShoppingList } from "../types/shopping-list";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "UnauthenticatedError";
  }
}

export async function fetchShoppingLists(): Promise<ShoppingList[]> {
  const response = await fetch("/api/lists", {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });

  if (response.status === 401) {
    throw new UnauthenticatedError();
  }

  if (!response.ok) {
    throw new Error(
      `Loading the shopping lists failed with ${response.status}`,
    );
  }

  return (await response.json()) as ShoppingList[];
}
