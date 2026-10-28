import type { RequestHandler } from "express";

export const requireAdmin: RequestHandler = (request, response, next) => {
  if (!request.currentUser) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  if (request.currentUser.role !== "admin") {
    response.status(403).json({ error: "Administrator access required" });
    return;
  }

  next();
};
