import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { InvalidCredentialsError } from "../api/auth";
import LoginView from "./LoginView.vue";

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));

vi.mock("../auth/session", () => ({
  authSession: { login: loginMock },
}));

async function mountLoginView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/login", name: "login", component: LoginView },
      {
        path: "/",
        name: "dashboard",
        component: { template: "<p>Dashboard</p>" },
      },
    ],
  });
  await router.push("/login");
  await router.isReady();

  return {
    router,
    wrapper: mount(LoginView, { global: { plugins: [router] } }),
  };
}

describe("LoginView", () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  test("shows an error when the credentials are invalid", async () => {
    loginMock.mockRejectedValue(new InvalidCredentialsError());
    const { wrapper } = await mountLoginView();

    await wrapper.get('input[name="username"]').setValue("alice");
    await wrapper.get('input[name="password"]').setValue("wrong");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(loginMock).toHaveBeenCalledWith("alice", "wrong");
    expect(wrapper.get('[role="alert"]').text()).toBe(
      "Benutzername oder Passwort ist falsch.",
    );
  });

  test("opens the protected dashboard after login", async () => {
    loginMock.mockResolvedValue(undefined);
    const { router, wrapper } = await mountLoginView();

    await wrapper.get('input[name="username"]').setValue("alice");
    await wrapper.get('input[name="password"]').setValue("correct-password");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("dashboard");
  });
});
