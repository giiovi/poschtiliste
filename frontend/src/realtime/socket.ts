import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

// the session cookie authenticates the handshake, so connect only after login
export function connectRealtime(): Socket {
  socket ??= io({ withCredentials: true });
  return socket;
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}
