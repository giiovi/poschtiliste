import type { ShoppingItem } from "../types/shopping-item";

export type RealtimeEvent =
  | {
      name: "list:assigned";
      payload: { listId: number; assignedUserId: number; actorUserId: number };
    }
  | {
      name: "list:updated";
      payload: {
        listId: number;
        actorUserId: number;
        change: "created" | "updated" | "deleted" | "assignment-removed";
      };
    }
  | {
      name: "item:added";
      payload: { listId: number; actorUserId: number; item: ShoppingItem };
    }
  | {
      name: "item:updated";
      payload: { listId: number; actorUserId: number; item: ShoppingItem };
    }
  | {
      name: "item:deleted";
      payload: { listId: number; actorUserId: number; itemId: number };
    };

export interface RealtimeNotification {
  userIds: number[];
  event: RealtimeEvent;
}

type NotificationSubscriber = (notification: RealtimeNotification) => void;

export class RealtimeNotifier {
  private readonly subscribers = new Set<NotificationSubscriber>();

  subscribe(subscriber: NotificationSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  notifyUsers(userIds: number[], event: RealtimeEvent): void {
    const uniqueUserIds = [...new Set(userIds)].sort((a, b) => a - b);

    if (uniqueUserIds.length === 0) {
      return;
    }

    for (const subscriber of this.subscribers) {
      subscriber({ userIds: uniqueUserIds, event });
    }
  }
}
