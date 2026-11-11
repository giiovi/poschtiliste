import { ValidationError } from "../src/errors/http-error";
import {
  validateShoppingListInput,
  validateShoppingListUpdate,
} from "../src/validation/shopping-list-validation";

const currentUserId = 7;

describe("validateShoppingListInput", () => {
  test("accepts a complete valid body and trims the title", () => {
    expect(
      validateShoppingListInput(
        {
          title: "  Wocheneinkauf  ",
          dueDate: "2026-09-12",
          responsibleUserId: 2,
          assignedUserIds: [2, 3, 2],
        },
        currentUserId,
      ),
    ).toEqual({
      title: "Wocheneinkauf",
      dueDate: "2026-09-12",
      responsibleUserId: 2,
      assignedUserIds: [2, 3],
    });
  });

  test("defaults due date, responsible user and assignments", () => {
    expect(
      validateShoppingListInput({ title: "Grillabend" }, currentUserId),
    ).toEqual({
      title: "Grillabend",
      dueDate: null,
      responsibleUserId: currentUserId,
      assignedUserIds: [],
    });
  });

  test.each([
    [{ title: "x".repeat(255) }, { title: "x".repeat(255) }],
    [{ title: "L", dueDate: "2028-02-29" }, { dueDate: "2028-02-29" }],
    [{ title: "L", dueDate: "" }, { dueDate: null }],
    [
      { title: "L", responsibleUserId: null },
      { responsibleUserId: currentUserId },
    ],
    [{ title: "L", assignedUserIds: [] }, { assignedUserIds: [] }],
    [{ title: "L", assignedUserIds: [4, 4, 4] }, { assignedUserIds: [4] }],
  ])("accepts boundary body %j", (body, expected) => {
    expect(validateShoppingListInput(body, currentUserId)).toMatchObject(
      expected,
    );
  });

  test.each([
    [[], "Request body must be a JSON object"],
    ["Liste", "Request body must be a JSON object"],
    [{ title: 5 }, "Title is required"],
    [
      { title: "L", dueDate: "2027-02-29" },
      "Due date is not a valid calendar date",
    ],
    [
      { title: "L", assignedUserIds: [1.5] },
      "Assigned user ids must contain positive integers only",
    ],
    [
      { title: "L", assignedUserIds: ["1"] },
      "Assigned user ids must contain positive integers only",
    ],
  ])("rejects boundary body %j with %s", (body, message) => {
    expect(() => validateShoppingListInput(body, currentUserId)).toThrow(
      new ValidationError(message),
    );
  });

  test.each([
    [null, "Request body must be a JSON object"],
    [{}, "Title is required"],
    [{ title: "   " }, "Title is required"],
    [
      { title: "x".repeat(256) },
      "Title must not be longer than 255 characters",
    ],
    [
      { title: "Liste", dueDate: "12.09.2026" },
      "Due date must have the format YYYY-MM-DD",
    ],
    [
      { title: "Liste", dueDate: "2026-02-30" },
      "Due date is not a valid calendar date",
    ],
    [
      { title: "Liste", responsibleUserId: "2" },
      "Responsible user id must be a positive integer",
    ],
    [
      { title: "Liste", responsibleUserId: 0 },
      "Responsible user id must be a positive integer",
    ],
    [
      { title: "Liste", assignedUserIds: 3 },
      "Assigned user ids must be an array",
    ],
    [
      { title: "Liste", assignedUserIds: [1, -2] },
      "Assigned user ids must contain positive integers only",
    ],
  ])("rejects %j with %s", (body, message) => {
    expect(() => validateShoppingListInput(body, currentUserId)).toThrow(
      new ValidationError(message),
    );
  });
});

describe("validateShoppingListUpdate", () => {
  test("accepts partial updates", () => {
    expect(
      validateShoppingListUpdate({ title: " Neu ", completed: true }),
    ).toEqual({ title: "Neu", completed: true });
    expect(validateShoppingListUpdate({ dueDate: null })).toEqual({
      dueDate: null,
    });
  });

  test("accepts completed false with a responsible user", () => {
    expect(
      validateShoppingListUpdate({ completed: false, responsibleUserId: 3 }),
    ).toEqual({ completed: false, responsibleUserId: 3 });
  });

  test.each([
    [{}, "At least one field must be provided"],
    [{ completed: "yes" }, "Completed must be a boolean"],
    [{ title: "" }, "Title is required"],
    [{ dueDate: "bad" }, "Due date must have the format YYYY-MM-DD"],
    [
      { responsibleUserId: 1.5 },
      "Responsible user id must be a positive integer",
    ],
  ])("rejects %j with %s", (body, message) => {
    expect(() => validateShoppingListUpdate(body)).toThrow(
      new ValidationError(message),
    );
  });
});
