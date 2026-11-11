import type { RequestHandler } from "express";
import session from "express-session";

export const SESSION_COOKIE_NAME = "poschtiliste.sid";

const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export function useSecureSessionCookie(
  environment: NodeJS.ProcessEnv,
): boolean {
  const configured = environment.SESSION_COOKIE_SECURE?.trim().toLowerCase();

  if (!configured) {
    return environment.NODE_ENV === "production";
  }

  if (configured === "true") {
    return true;
  }

  if (configured === "false") {
    return false;
  }

  throw new Error("SESSION_COOKIE_SECURE must be true or false");
}

export function createSessionMiddleware(
  environment: NodeJS.ProcessEnv = process.env,
): RequestHandler {
  const secret = environment.SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error("Missing required environment variable: SESSION_SECRET");
  }

  return session({
    name: SESSION_COOKIE_NAME,
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: useSecureSessionCookie(environment),
      maxAge: ONE_DAY_IN_MILLISECONDS,
    },
  });
}
