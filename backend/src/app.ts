import express, { type Express } from "express";

import { createDatabase, type Database } from "./db/database";
import { errorHandler } from "./middleware/error-handler";
import { createRequireAuth } from "./middleware/require-auth";
import { createAuthRouter } from "./routes/auth-routes";
import { createHealthRouter } from "./routes/health-routes";
import { createShoppingListRouter } from "./routes/shopping-list-routes";
import { createAuthService } from "./services/auth-service";
import { createShoppingListService } from "./services/shopping-list-service";
import { createUserService } from "./services/user-service";
import { createSessionMiddleware } from "./session";

interface CreateAppOptions {
  database?: Database;
  environment?: NodeJS.ProcessEnv;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const environment = options.environment ?? process.env;
  const app = express();
  const database = options.database ?? createDatabase(environment);
  const authService = createAuthService(database);
  const userService = createUserService(database);
  const shoppingListService = createShoppingListService(database);
  const requireAuth = createRequireAuth(userService);
  app.use(express.json());
  app.use(createSessionMiddleware(environment));

  app.use("/api/health", createHealthRouter());
  app.use("/api/auth", createAuthRouter(authService));
  app.use(
    "/api/lists",
    createShoppingListRouter(shoppingListService, requireAuth),
  );
  app.use(errorHandler);

  return app;
}
