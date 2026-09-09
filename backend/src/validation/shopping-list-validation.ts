import { ValidationError } from "../errors/http-error";

export interface ShoppingListInput {
  title: string;
  dueDate: string | null;
  responsibleUserId: number;
  assignedUserIds: number[];
}

export interface ShoppingListUpdate {
  title?: string;
  dueDate?: string | null;
  responsibleUserId?: number;
  completed?: boolean;
}

const MAX_TITLE_LENGTH = 255;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function validateTitle(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError("Title is required");
  }

  const title = value.trim();

  if (title.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(
      `Title must not be longer than ${MAX_TITLE_LENGTH} characters`,
    );
  }

  return title;
}

function validateDueDate(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    throw new ValidationError("Due date must have the format YYYY-MM-DD");
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new ValidationError("Due date is not a valid calendar date");
  }

  return value;
}

function validateResponsibleUserId(
  value: unknown,
  fallbackUserId: number,
): number {
  if (value === undefined || value === null) {
    return fallbackUserId;
  }

  if (!isPositiveInteger(value)) {
    throw new ValidationError("Responsible user id must be a positive integer");
  }

  return value;
}

function validateAssignedUserIds(value: unknown): number[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ValidationError("Assigned user ids must be an array");
  }

  const assignedUserIds: number[] = [];

  for (const entry of value) {
    if (!isPositiveInteger(entry)) {
      throw new ValidationError(
        "Assigned user ids must contain positive integers only",
      );
    }

    if (!assignedUserIds.includes(entry)) {
      assignedUserIds.push(entry);
    }
  }

  return assignedUserIds;
}

export function validateShoppingListInput(
  body: unknown,
  currentUserId: number,
): ShoppingListInput {
  if (!isRecord(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  return {
    title: validateTitle(body.title),
    dueDate: validateDueDate(body.dueDate),
    responsibleUserId: validateResponsibleUserId(
      body.responsibleUserId,
      currentUserId,
    ),
    assignedUserIds: validateAssignedUserIds(body.assignedUserIds),
  };
}

export function validateShoppingListUpdate(body: unknown): ShoppingListUpdate {
  if (!isRecord(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const update: ShoppingListUpdate = {};

  if (body.title !== undefined) {
    update.title = validateTitle(body.title);
  }

  if (body.dueDate !== undefined) {
    update.dueDate = validateDueDate(body.dueDate);
  }

  if (body.responsibleUserId !== undefined) {
    if (!isPositiveInteger(body.responsibleUserId)) {
      throw new ValidationError(
        "Responsible user id must be a positive integer",
      );
    }

    update.responsibleUserId = body.responsibleUserId;
  }

  if (body.completed !== undefined) {
    if (typeof body.completed !== "boolean") {
      throw new ValidationError("Completed must be a boolean");
    }

    update.completed = body.completed;
  }

  if (Object.keys(update).length === 0) {
    throw new ValidationError("At least one field must be provided");
  }

  return update;
}
