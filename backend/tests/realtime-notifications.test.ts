import request from "supertest";

import {
  RealtimeNotifier,
  type RealtimeNotification,
} from "../src/realtime/realtime-notifier";
import {
  createTestContext,
  loginAs,
  type TestContext,
} from "./helpers/test-app";

const bcryptHash = `$2b$12$${"a".repeat(53)}`;

describe("shopping-list realtime notifications", () => {
  let context: TestContext;
  let notifier: RealtimeNotifier;
  let notifications: RealtimeNotification[];
  let aliceId: number;
  let bobId: number;
  let carolId: number;
  let listId: number;

  beforeEach(async () => {
    notifier = new RealtimeNotifier();
    notifications = [];
    notifier.subscribe((notification) => notifications.push(notification));
    context = await createTestContext(notifier);

    const insertUser = async (username: string) => {
      const [id] = await context.connection("users").insert({
        username,
        password_hash: bcryptHash,
        role: "user",
      });
      return id;
    };

    aliceId = await insertUser("alice");
    bobId = await insertUser("bob");
    carolId = await insertUser("carol");
    [listId] = await context.connection("shopping_lists").insert({
      title: "Wocheneinkauf",
      responsible_user_id: aliceId,
    });
    await context.connection("list_assignments").insert({
      shopping_list_id: listId,
      user_id: bobId,
    });
  });

  afterEach(async () => {
    await context.connection.destroy();
  });

  async function asAlice(
    method: "post" | "patch" | "delete",
    path: string,
    body?: object,
  ) {
    const operation = request(context.app)
      [method](path)
      .set("Cookie", await loginAs(context.app, aliceId));

    return body === undefined ? operation : operation.send(body);
  }

  test("emits documented events only to responsible and assigned users", async () => {
    await asAlice("patch", `/api/lists/${listId}`, {
      title: "Wochenendeinkauf",
    });

    expect(notifications[0]).toMatchObject({
      userIds: [aliceId, bobId],
      event: {
        name: "list:updated",
        payload: { listId, actorUserId: aliceId, change: "updated" },
      },
    });
    expect(notifications[0].userIds).not.toContain(carolId);

    await asAlice("post", `/api/lists/${listId}/assignments`, {
      userId: carolId,
    });

    const createResponse = await asAlice("post", `/api/lists/${listId}/items`, {
      name: "Milch",
      quantity: 2,
    });
    const itemId = createResponse.body.id as number;

    await asAlice("patch", `/api/lists/${listId}/items/${itemId}`, {
      purchased: true,
    });
    await asAlice("delete", `/api/lists/${listId}/items/${itemId}`);
    await asAlice("delete", `/api/lists/${listId}/assignments/${carolId}`);
    await asAlice("delete", `/api/lists/${listId}`);

    expect(notifications.map(({ event }) => event.name)).toEqual([
      "list:updated",
      "list:assigned",
      "item:added",
      "item:updated",
      "item:deleted",
      "list:updated",
      "list:updated",
    ]);
    expect(notifications[1]).toMatchObject({
      userIds: [aliceId, bobId, carolId],
      event: {
        payload: { assignedUserId: carolId },
      },
    });
    expect(notifications[5]).toMatchObject({
      userIds: [aliceId, bobId, carolId],
      event: { payload: { change: "assignment-removed" } },
    });
    expect(notifications[6]).toMatchObject({
      userIds: [aliceId, bobId],
      event: { payload: { change: "deleted" } },
    });
  });
});
