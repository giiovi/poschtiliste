import type { User } from "../types/user";

interface AuthResponse {
  user: User;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid username or password");
    this.name = "InvalidCredentialsError";
  }
}

export async function loginUser(
  username: string,
  password: string,
): Promise<User> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ username, password }),
  });

  if (response.status === 401) {
    throw new InvalidCredentialsError();
  }

  if (!response.ok) {
    throw new Error(`Login failed with ${response.status}`);
  }

  const body = (await response.json()) as AuthResponse;
  return body.user;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch("/api/auth/me", {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Loading the current user failed with ${response.status}`);
  }

  const body = (await response.json()) as AuthResponse;
  return body.user;
}

export async function logoutUser(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Logout failed with ${response.status}`);
  }
}
