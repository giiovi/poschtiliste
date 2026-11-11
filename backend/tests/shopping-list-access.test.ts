import { hasShoppingListAccess } from "../src/authorization/shopping-list-access";
import type { PublicUser } from "../src/types/user";

const user: PublicUser = {
  id: 2,
  username: "alice",
  role: "user",
  created_at: "2026-09-01 10:00:00",
  updated_at: "2026-09-01 10:00:00",
};

describe("shopping-list authorization", () => {
  test("allows administrators regardless of responsibility or assignment", () => {
    expect(hasShoppingListAccess({ ...user, role: "admin" }, 99, false)).toBe(
      true,
    );
  });

  test("allows the responsible user", () => {
    expect(hasShoppingListAccess(user, user.id, false)).toBe(true);
  });

  test("allows an assigned user", () => {
    expect(hasShoppingListAccess(user, 99, true)).toBe(true);
  });

  test("rejects an unrelated user", () => {
    expect(hasShoppingListAccess(user, 99, false)).toBe(false);
  });
});
