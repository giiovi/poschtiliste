import type { RequestHandler } from "express";

import type { UserService } from "../services/user-service";
import { asyncHandler } from "./async-handler";

export function createRequireAuth(userService: UserService): RequestHandler {
  return asyncHandler(async (request, response, next) => {
    const userId = request.session?.userId;

    if (userId === undefined) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }

    const user = await userService.findById(userId);

    if (!user) {
      // the session points to a user that no longer exists
      response.status(401).json({ error: "Authentication required" });
      return;
    }

    request.currentUser = user;
    next();
  });
}
