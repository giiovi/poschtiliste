import type { UserOption } from "../types/user";
import { requestJson } from "./http";

export function fetchUsers(): Promise<UserOption[]> {
  return requestJson<UserOption[]>("/api/users");
}
