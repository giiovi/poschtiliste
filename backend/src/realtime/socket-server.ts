import type { Server as HttpServer } from "node:http";

import type { RequestHandler } from "express";
import { Server } from "socket.io";

import type { UserService } from "../services/user-service";
import type { PublicUser } from "../types/user";

export interface SocketData {
  user: PublicUser;
}

export type SocketServer = Server<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  SocketData
>;

interface SocketServerOptions {
  sessionMiddleware: RequestHandler;
  userService: UserService;
}

export function userRoom(userId: number): string {
  return `user:${userId}`;
}

export function createSocketServer(
  httpServer: HttpServer,
  { sessionMiddleware, userService }: SocketServerOptions,
): SocketServer {
  const io: SocketServer = new Server(httpServer);

  // shares the express session, see https://socket.io/how-to/use-with-express-session
  io.engine.use(sessionMiddleware);

  io.use(async (socket, next) => {
    try {
      const userId = socket.request.session.userId;
      const user =
        userId === undefined ? null : await userService.findById(userId);

      if (!user) {
        next(new Error("Authentication required"));
        return;
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error(String(error)));
    }
  });

  io.on("connection", async (socket) => {
    await socket.join(userRoom(socket.data.user.id));
  });

  return io;
}
