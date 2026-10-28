import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import { io as connectClient, type Socket } from "socket.io-client";

import {
  createSocketServer,
  type SocketServer,
  userRoom,
} from "../src/realtime/socket-server";
import {
  createTestContext,
  loginAs,
  type TestContext,
} from "./helpers/test-app";

describe("authenticated socket connections", () => {
  let context: TestContext;
  let httpServer: HttpServer;
  let socketServer: SocketServer;
  let client: Socket | undefined;
  let aliceId: number;

  // resolves with the connected client or the handshake error message
  function connect(cookies: string[] = []): Promise<Socket | string> {
    const { port } = httpServer.address() as AddressInfo;
    client = connectClient(`http://localhost:${port}`, {
      transports: ["websocket"],
      reconnection: false,
      extraHeaders: {
        cookie: cookies.map((cookie) => cookie.split(";")[0]).join("; "),
      },
    });

    return new Promise((resolve) => {
      client?.on("connect", () => resolve(client as Socket));
      client?.on("connect_error", (error) => resolve(error.message));
    });
  }

  beforeEach(async () => {
    context = await createTestContext();
    [aliceId] = await context.connection("users").insert({
      username: "alice",
      password_hash: `$2b$12$${"a".repeat(53)}`,
      role: "user",
    });

    httpServer = createServer(context.app);
    socketServer = createSocketServer(httpServer, context);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  });

  afterEach(async () => {
    client?.disconnect();
    await socketServer.close();
    await context.connection.destroy();
  });

  test("accepts a logged-in user and joins the user room", async () => {
    const result = await connect(await loginAs(context.app, aliceId));

    expect(typeof result).not.toBe("string");
    const sockets = await socketServer.in(userRoom(aliceId)).fetchSockets();
    expect(sockets.map((socket) => socket.data.user.username)).toEqual([
      "alice",
    ]);
  });

  test.each([
    ["without a session", async () => []],
    ["for a deleted user", async () => loginAs(context.app, 999)],
  ])("rejects connections %s", async (_case, cookies) => {
    expect(await connect(await cookies())).toBe("Authentication required");
    expect(await socketServer.fetchSockets()).toHaveLength(0);
  });
});
