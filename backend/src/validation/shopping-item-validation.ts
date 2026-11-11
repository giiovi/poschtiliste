export interface CreateShoppingItemBody {
  name: string;
  quantity: number;
}

export interface UpdateShoppingItemBody {
  name?: string;
  quantity?: number;
  purchased?: boolean;
}

export function validateShoppingItemCreate(
  value: unknown,
): CreateShoppingItemBody | null {
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

export function validateShoppingItemUpdate(
  value: unknown,
): UpdateShoppingItemBody | null {
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
