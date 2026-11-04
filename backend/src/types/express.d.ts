import "express-session";
import type { Session, SessionData } from "express-session";

import type { PublicUser } from "./user";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// socket.io handshakes are plain node requests that pass the session middleware
declare module "http" {
  interface IncomingMessage {
    session: Session & Partial<SessionData>;
  }
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: PublicUser;
    }
  }
}
