import path from "node:path";

import express, { type Express, type RequestHandler } from "express";

import { createDatabase, type Database } from "./db/database";
import { errorHandler } from "./middleware/error-handler";
import { createRequireAuth } from "./middleware/require-auth";
import { RealtimeNotifier } from "./realtime/realtime-notifier";
import { createAdminUserRouter } from "./routes/admin-user-routes";
import { createAuthRouter } from "./routes/auth-routes";
import { createHealthRouter } from "./routes/health-routes";
import { createShoppingListRouter } from "./routes/shopping-list-routes";
import { createUserRouter } from "./routes/user-routes";
import { createAdminUserService } from "./services/admin-user-service";
import { createAuthService } from "./services/auth-service";
import { createShoppingItemService } from "./services/shopping-item-service";
import { createShoppingListService } from "./services/shopping-list-service";
import { createUserService } from "./services/user-service";
import { createSessionMiddleware } from "./session";

interface CreateAppOptions {
  database?: Database;
  environment?: NodeJS.ProcessEnv;
  sessionMiddleware?: RequestHandler;
  realtimeNotifier?: RealtimeNotifier;
}

function serveProductionFrontend(
  app: Express,
  environment: NodeJS.ProcessEnv,
): void {
  if (environment.NODE_ENV !== "production") {
    return;
  }

  const frontendDirectory =
    environment.FRONTEND_DIST_DIR?.trim() ||
    path.resolve(process.cwd(), "frontend/dist");

  app.use(express.static(frontendDirectory));
  app.use((request, response, next) => {
    const isBackendPath =
      request.path === "/api" ||
      request.path.startsWith("/api/") ||
      request.path === "/socket.io" ||
      request.path.startsWith("/socket.io/");

    if (request.method !== "GET" || isBackendPath) {
      next();
      return;
    }

    response.sendFile(path.join(frontendDirectory, "index.html"), (error) => {
      if (error) {
        next(error);
      }
    });
  });
}

export function createApp(options: CreateAppOptions = {}): Express {
  const environment = options.environment ?? process.env;
  const app = express();
  const database = options.database ?? createDatabase(environment);
  const authService = createAuthService(database);
  const userService = createUserService(database);
  const shoppingListService = createShoppingListService(database);
  const shoppingItemService = createShoppingItemService(database);
  const requireAuth = createRequireAuth(userService);
  app.use(express.json());
  app.use(options.sessionMiddleware ?? createSessionMiddleware(environment));

  app.use("/api/health", createHealthRouter());
  app.use("/api/auth", createAuthRouter(authService, requireAuth));
  app.use(
    "/api/lists",
    createShoppingListRouter(
      shoppingListService,
      shoppingItemService,
      requireAuth,
      options.realtimeNotifier,
    ),
  );
  app.use("/api/users", createUserRouter(userService, requireAuth));
  app.use(
    "/api/admin/users",
    createAdminUserRouter(createAdminUserService(database), requireAuth),
  );
  serveProductionFrontend(app, environment);
  app.use(errorHandler);

  return app;
}
