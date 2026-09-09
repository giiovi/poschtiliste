import "express-session";

import type { PublicUser } from "./user";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: PublicUser;
    }
  }
}
