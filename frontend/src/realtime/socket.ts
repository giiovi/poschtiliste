import { io, type Socket } from "socket.io-client";

import type {
  RealtimeEvent,
  RealtimeEventMap,
  ServerToClientEvents,
} from "./events";

type RealtimeListener = (event: RealtimeEvent) => void;

let socket: Socket<ServerToClientEvents> | null = null;
const listeners = new Set<RealtimeListener>();

function publish<Name extends keyof RealtimeEventMap>(
  name: Name,
  payload: RealtimeEventMap[Name],
): void {
  const event = { name, payload } as RealtimeEvent;
  listeners.forEach((listener) => listener(event));
}

function registerEventListeners(client: Socket<ServerToClientEvents>): void {
  client.on("list:assigned", (payload) => publish("list:assigned", payload));
  client.on("list:updated", (payload) => publish("list:updated", payload));
  client.on("item:added", (payload) => publish("item:added", payload));
  client.on("item:updated", (payload) => publish("item:updated", payload));
  client.on("item:deleted", (payload) => publish("item:deleted", payload));
}

// the session cookie authenticates the handshake, so connect only after login
export function connectRealtime(): Socket<ServerToClientEvents> {
  if (!socket) {
    socket = io({ withCredentials: true });
    registerEventListeners(socket);
  }

  return socket;
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}

export function subscribeRealtime(listener: RealtimeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
