import express, { type Express } from "express";
import nunjucks from "nunjucks";

import { createDatabase } from "./db/database";
import { errorHandler } from "./middleware/error-handler";
import { createRequireAuth } from "./middleware/require-auth";
import { createDemoRouter } from "./routes/demo-routes";
import { createHealthRouter } from "./routes/health-routes";
import { createShoppingListRouter } from "./routes/shopping-list-routes";
import { createArtistService } from "./services/artist-service";
import { createShoppingListService } from "./services/shopping-list-service";
import { createUserService } from "./services/user-service";
import { createSessionMiddleware } from "./session";

export function createApp(): Express {
  const app = express();
  const database = createDatabase();
  const artistService = createArtistService(database);
  const userService = createUserService(database);
  const shoppingListService = createShoppingListService(database);
  const requireAuth = createRequireAuth(userService);

  nunjucks.configure("views", {
    express: app,
    autoescape: true,
    noCache: true,
  });

  app.set("view engine", "njk");
  app.set("views", "./views");
  app.use(express.json());
  app.use(createSessionMiddleware());

  app.use("/api/health", createHealthRouter());
  app.use(
    "/api/lists",
    createShoppingListRouter(shoppingListService, requireAuth),
  );
  app.use(createDemoRouter(artistService));
  app.use(errorHandler);

  return app;
}
