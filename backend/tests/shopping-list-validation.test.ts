import { ValidationError } from "../src/errors/validation-error";
import { validateShoppingListInput } from "../src/validation/shopping-list-validation";

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
