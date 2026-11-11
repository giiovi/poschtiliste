import {
  validateShoppingItemCreate,
  validateShoppingItemUpdate,
} from "../src/validation/shopping-item-validation";

describe("validateShoppingItemCreate", () => {
  test.each([
    [{ name: "Milch" }, { name: "Milch", quantity: 1 }],
    [
      { name: "  Brot  ", quantity: 3 },
      { name: "Brot", quantity: 3 },
    ],
    [{ name: "x".repeat(255) }, { name: "x".repeat(255), quantity: 1 }],
    [{ name: "x".repeat(254) }, { name: "x".repeat(254), quantity: 1 }],
    [
      { name: "Eier", quantity: 1 },
      { name: "Eier", quantity: 1 },
    ],
    [
      { name: "Salz", quantity: Number.MAX_SAFE_INTEGER },
      { name: "Salz", quantity: Number.MAX_SAFE_INTEGER },
    ],
  ])("accepts %j", (body, expected) => {
    expect(validateShoppingItemCreate(body)).toEqual(expected);
  });

  test.each([
    [null],
    [undefined],
    ["Milch"],
    [42],
    [{}],
    [{ name: "" }],
    [{ name: "   " }],
    [{ name: 5 }],
    [{ name: null }],
    [{ name: "x".repeat(256) }],
    [{ name: "Milch", quantity: 0 }],
    [{ name: "Milch", quantity: -1 }],
    [{ name: "Milch", quantity: 1.5 }],
    [{ name: "Milch", quantity: "2" }],
    [{ name: "Milch", quantity: Number.MAX_SAFE_INTEGER + 1 }],
    [{ name: "Milch", quantity: Number.NaN }],
  ])("rejects %j", (body) => {
    expect(validateShoppingItemCreate(body)).toBeNull();
  });
});

describe("validateShoppingItemUpdate", () => {
  test.each([
    [{ name: " Brot " }, { name: "Brot" }],
    [{ name: "x".repeat(255) }, { name: "x".repeat(255) }],
    [{ quantity: 1 }, { quantity: 1 }],
    [{ purchased: true }, { purchased: true }],
    [{ purchased: false }, { purchased: false }],
    [
      { name: "Käse", quantity: 2, purchased: true, extra: "ignored" },
      { name: "Käse", quantity: 2, purchased: true },
    ],
  ])("accepts %j", (body, expected) => {
    expect(validateShoppingItemUpdate(body)).toEqual(expected);
  });

  test.each([
    [null],
    [undefined],
    [[]],
    [[{ name: "Milch" }]],
    ["Milch"],
    [42],
    [{}],
    [{ extra: 1 }],
    [{ name: "" }],
    [{ name: "   " }],
    [{ name: 5 }],
    [{ name: "x".repeat(256) }],
    [{ quantity: 0 }],
    [{ quantity: -3 }],
    [{ quantity: 2.5 }],
    [{ quantity: "2" }],
    [{ quantity: undefined }],
    [{ purchased: "true" }],
    [{ purchased: 1 }],
    [{ purchased: null }],
    [{ name: "Milch", quantity: 0 }],
  ])("rejects %j", (body) => {
    expect(validateShoppingItemUpdate(body)).toBeNull();
  });
});
