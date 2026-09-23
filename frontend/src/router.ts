import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouterHistory,
} from "vue-router";

import { authSession, type AuthSession } from "./auth/session";

function loginRedirect(to: RouteLocationNormalized) {
  return {
    name: "login",
    query: to.fullPath === "/" ? {} : { redirect: to.fullPath },
  };
}

export function createAppRouter(
  session: AuthSession = authSession,
  history: RouterHistory = createWebHistory(),
) {
  const router = createRouter({
    history,
    routes: [
      {
        path: "/",
        name: "dashboard",
        component: () => import("./views/DashboardView.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "/login",
        name: "login",
        component: () => import("./views/LoginView.vue"),
      },
      { path: "/:pathMatch(.*)*", redirect: "/" },
    ],
  });

  router.beforeEach(async (to) => {
    try {
      await session.initialize();
    } catch {
      session.clear();
      return to.name === "login"
        ? true
        : { ...loginRedirect(to), query: { reason: "unavailable" } };
    }

    if (to.meta.requiresAuth && !session.currentUser.value) {
      return loginRedirect(to);
    }

    if (to.name === "login" && session.currentUser.value) {
      return { name: "dashboard" };
    }

    return true;
  });

  return router;
}

export default createAppRouter();
