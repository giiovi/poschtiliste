import type { AdminUser, UserRole } from "../types/user";
import { ApiError, requestJson, UnauthenticatedError } from "./http";

export { ApiError, UnauthenticatedError };

const BASE_PATH = "/api/admin/users";

// backend messages are english, the interface is german
const ERROR_MESSAGES: Record<string, string> = {
  "Username is required": "Bitte gib einen Benutzernamen ein.",
  "Username must not be longer than 100 characters":
    "Der Benutzername darf höchstens 100 Zeichen lang sein.",
  "Username is already taken": "Dieser Benutzername ist bereits vergeben.",
  "Password must be at least 8 characters long":
    "Das Passwort muss mindestens 8 Zeichen lang sein.",
  "Password must not be longer than 72 bytes": "Das Passwort ist zu lang.",
  "Role must be admin or user": "Bitte wähle eine gültige Rolle.",
  "Administrators cannot remove their own admin role":
    "Du kannst dir die Admin-Rolle nicht selbst entziehen.",
  "Administrators cannot delete their own account":
    "Du kannst dein eigenes Konto nicht löschen.",
  "User is still responsible for shopping lists":
    "Der Benutzer ist noch für Einkaufslisten verantwortlich. Übertrage diese zuerst an jemand anderen.",
  "User not found": "Diesen Benutzer gibt es nicht mehr.",
  "Administrator access required": "Dafür brauchst du Admin-Rechte.",
};

export function describeAdminError(error: unknown): string {
  if (error instanceof ApiError && ERROR_MESSAGES[error.message]) {
    return ERROR_MESSAGES[error.message];
  }

  return "Die Aktion ist fehlgeschlagen. Bitte versuche es erneut.";
}

export function fetchAdminUsers(): Promise<AdminUser[]> {
  return requestJson<AdminUser[]>(BASE_PATH);
}

export function createAdminUser(input: {
  username: string;
  password: string;
  role: UserRole;
}): Promise<AdminUser> {
  return requestJson<AdminUser>(BASE_PATH, { method: "POST", body: input });
}

export function updateAdminUser(
  id: number,
  update: { username: string; role: UserRole },
): Promise<AdminUser> {
  return requestJson<AdminUser>(`${BASE_PATH}/${id}`, {
    method: "PATCH",
    body: update,
  });
}

export function deleteAdminUser(id: number): Promise<void> {
  return requestJson<void>(`${BASE_PATH}/${id}`, { method: "DELETE" });
}

export function resetAdminUserPassword(
  id: number,
  password: string,
): Promise<void> {
  return requestJson<void>(`${BASE_PATH}/${id}/password`, {
    method: "PUT",
    body: { password },
  });
}
