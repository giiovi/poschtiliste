import { ValidationError } from "../errors/http-error";
import type { UserRole } from "../types/user";

export interface UserInput {
  username: string;
  password: string;
  role: UserRole;
}

export interface UserUpdate {
  username?: string;
  role?: UserRole;
}

const MAX_USERNAME_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const ROLES: UserRole[] = ["admin", "user"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateUsername(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError("Username is required");
  }

  const username = value.trim();

  if (username.length > MAX_USERNAME_LENGTH) {
    throw new ValidationError(
      `Username must not be longer than ${MAX_USERNAME_LENGTH} characters`,
    );
  }

  return username;
}

function validatePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    );
  }

  if (Buffer.byteLength(value, "utf8") > MAX_PASSWORD_BYTES) {
    throw new ValidationError(
      `Password must not be longer than ${MAX_PASSWORD_BYTES} bytes`,
    );
  }

  return value;
}

function validateRole(value: unknown): UserRole {
  if (!ROLES.includes(value as UserRole)) {
    throw new ValidationError("Role must be admin or user");
  }

  return value as UserRole;
}

export function validateUserInput(body: unknown): UserInput {
  if (!isRecord(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  return {
    username: validateUsername(body.username),
    password: validatePassword(body.password),
    role: body.role === undefined ? "user" : validateRole(body.role),
  };
}

export function validateUserUpdate(body: unknown): UserUpdate {
  if (!isRecord(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const update: UserUpdate = {};

  if (body.username !== undefined) {
    update.username = validateUsername(body.username);
  }

  if (body.role !== undefined) {
    update.role = validateRole(body.role);
  }

  if (Object.keys(update).length === 0) {
    throw new ValidationError("At least one field must be provided");
  }

  return update;
}

export function validatePasswordReset(body: unknown): string {
  if (!isRecord(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  return validatePassword(body.password);
}
