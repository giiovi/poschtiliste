import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import { io as connectClient, type Socket } from "socket.io-client";

import { RealtimeNotifier } from "../src/realtime/realtime-notifier";
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
  let notifier: RealtimeNotifier;
  let clients: Socket[];
  let aliceId: number;
  let bobId: number;

  // resolves with the connected client or the handshake error message
  function connect(cookies: string[] = []): Promise<Socket | string> {
    const { port } = httpServer.address() as AddressInfo;
    const client = connectClient(`http://localhost:${port}`, {
      transports: ["websocket"],
      reconnection: false,
      extraHeaders: {
        cookie: cookies.map((cookie) => cookie.split(";")[0]).join("; "),
      },
    });
    clients.push(client);

    return new Promise((resolve) => {
      client.on("connect", () => resolve(client));
      client.on("connect_error", (error) => resolve(error.message));
    });
  }

  beforeEach(async () => {
    notifier = new RealtimeNotifier();
    clients = [];
    context = await createTestContext(notifier);
    [aliceId] = await context.connection("users").insert({
      username: "alice",
      password_hash: `$2b$12$${"a".repeat(53)}`,
      role: "user",
    });
    [bobId] = await context.connection("users").insert({
      username: "bob",
      password_hash: `$2b$12$${"a".repeat(53)}`,
      role: "user",
    });

    httpServer = createServer(context.app);
    socketServer = createSocketServer(httpServer, { ...context, notifier });
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  });

  afterEach(async () => {
    clients.forEach((client) => client.disconnect());
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

  test("emits notifications to targeted user rooms only", async () => {
    const alice = await connect(await loginAs(context.app, aliceId));
    const bob = await connect(await loginAs(context.app, bobId));

    expect(typeof alice).not.toBe("string");
    expect(typeof bob).not.toBe("string");
    if (typeof alice === "string" || typeof bob === "string") {
      return;
    }

    const bobListener = jest.fn();
    bob.on("list:updated", bobListener);
    const aliceEvent = new Promise((resolve) =>
      alice.once("list:updated", resolve),
    );

    notifier.notifyUsers([aliceId], {
      name: "list:updated",
      payload: {
        listId: 7,
        actorUserId: aliceId,
        change: "updated",
      },
    });

    await expect(aliceEvent).resolves.toMatchObject({ listId: 7 });
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(bobListener).not.toHaveBeenCalled();
  });
});
