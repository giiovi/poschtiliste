import express, { type Express } from "express";
import nunjucks from "nunjucks";

import { createDatabase } from "./db/database";
import { errorHandler } from "./middleware/error-handler";
import { createDemoRouter } from "./routes/demo-routes";
import { createHealthRouter } from "./routes/health-routes";
import { createArtistService } from "./services/artist-service";

export function createApp(): Express {
  const app = express();
  const database = createDatabase();
  const artistService = createArtistService(database);

  nunjucks.configure("views", {
    express: app,
    autoescape: true,
    noCache: true,
  });

  app.set("view engine", "njk");
  app.set("views", "./views");
  app.use(express.json());

  app.use("/api/health", createHealthRouter());
  app.use(createDemoRouter(artistService));
  app.use(errorHandler);

  return app;
}
