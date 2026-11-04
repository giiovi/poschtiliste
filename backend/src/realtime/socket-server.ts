import type { Server as HttpServer } from "node:http";

import type { RequestHandler } from "express";
import { Server } from "socket.io";

import type { UserService } from "../services/user-service";
import type { PublicUser } from "../types/user";
import type { RealtimeEvent } from "./realtime-notifier";
import { RealtimeNotifier } from "./realtime-notifier";

interface ServerToClientEvents {
  "list:assigned": (
    payload: Extract<RealtimeEvent, { name: "list:assigned" }>["payload"],
  ) => void;
  "list:updated": (
    payload: Extract<RealtimeEvent, { name: "list:updated" }>["payload"],
  ) => void;
  "item:added": (
    payload: Extract<RealtimeEvent, { name: "item:added" }>["payload"],
  ) => void;
  "item:updated": (
    payload: Extract<RealtimeEvent, { name: "item:updated" }>["payload"],
  ) => void;
  "item:deleted": (
    payload: Extract<RealtimeEvent, { name: "item:deleted" }>["payload"],
  ) => void;
}

export interface SocketData {
  user: PublicUser;
}

export type SocketServer = Server<
  Record<string, never>,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

interface SocketServerOptions {
  sessionMiddleware: RequestHandler;
  userService: UserService;
  notifier?: RealtimeNotifier;
}

export function userRoom(userId: number): string {
  return `user:${userId}`;
}

export function createSocketServer(
  httpServer: HttpServer,
  { sessionMiddleware, userService, notifier }: SocketServerOptions,
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

  notifier?.subscribe(({ userIds, event }) => {
    const rooms = userIds.map(userRoom);

    switch (event.name) {
      case "list:assigned":
        io.to(rooms).emit(event.name, event.payload);
        break;
      case "list:updated":
        io.to(rooms).emit(event.name, event.payload);
        break;
      case "item:added":
        io.to(rooms).emit(event.name, event.payload);
        break;
      case "item:updated":
        io.to(rooms).emit(event.name, event.payload);
        break;
      case "item:deleted":
        io.to(rooms).emit(event.name, event.payload);
        break;
    }
  });

  return io;
}
