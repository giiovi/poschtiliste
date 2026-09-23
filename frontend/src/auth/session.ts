import { readonly, ref } from "vue";

import { fetchCurrentUser, loginUser, logoutUser } from "../api/auth";
import type { User } from "../types/user";

type SessionState = "unknown" | "authenticated" | "unauthenticated";

interface AuthApi {
  fetchCurrentUser(): Promise<User | null>;
  loginUser(username: string, password: string): Promise<User>;
  logoutUser(): Promise<void>;
}

const defaultApi: AuthApi = { fetchCurrentUser, loginUser, logoutUser };

export function createAuthSession(api: AuthApi = defaultApi) {
  const currentUser = ref<User | null>(null);
  const state = ref<SessionState>("unknown");
  let initialization: Promise<void> | null = null;

  async function initialize(): Promise<void> {
    if (state.value !== "unknown") {
      return;
    }

    initialization ??= api
      .fetchCurrentUser()
      .then((user) => {
        currentUser.value = user;
        state.value = user ? "authenticated" : "unauthenticated";
      })
      .finally(() => {
        initialization = null;
      });

    await initialization;
  }

  async function login(username: string, password: string): Promise<void> {
    currentUser.value = await api.loginUser(username, password);
    state.value = "authenticated";
  }

  async function logout(): Promise<void> {
    await api.logoutUser();
    clear();
  }

  function clear(): void {
    currentUser.value = null;
    state.value = "unauthenticated";
  }

  return {
    currentUser: readonly(currentUser),
    state: readonly(state),
    initialize,
    login,
    logout,
    clear,
  };
}

export type AuthSession = ReturnType<typeof createAuthSession>;

export const authSession = createAuthSession();
