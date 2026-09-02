import { Router } from "express";

import { asyncHandler } from "../middleware/async-handler";
import type { ArtistService } from "../services/artist-service";

export function createDemoRouter(artistService: ArtistService): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_request, response) => {
      const rows = await artistService.findByNamePrefix("A");

      response.render("hello.html", {
        today: new Date(),
        rows,
      });
    }),
  );

  router.get(
    "/json-demo",
    asyncHandler(async (_request, response) => {
      const rows = await artistService.list(10);

      response.json({
        today: new Date(),
        rows,
      });
    }),
  );

  return router;
}
