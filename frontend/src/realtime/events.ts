import type { ShoppingItem } from "../types/shopping-item";

export interface RealtimeEventMap {
  "list:assigned": {
    listId: number;
    assignedUserId: number;
    actorUserId: number;
  };
  "list:updated": {
    listId: number;
    actorUserId: number;
    change: "created" | "updated" | "deleted" | "assignment-removed";
  };
  "item:added": {
    listId: number;
    actorUserId: number;
    item: ShoppingItem;
  };
  "item:updated": {
    listId: number;
    actorUserId: number;
    item: ShoppingItem;
  };
  "item:deleted": {
    listId: number;
    actorUserId: number;
    itemId: number;
  };
}

export type RealtimeEvent = {
  [Name in keyof RealtimeEventMap]: {
    name: Name;
    payload: RealtimeEventMap[Name];
  };
}[keyof RealtimeEventMap];

export interface ServerToClientEvents {
  "list:assigned": (payload: RealtimeEventMap["list:assigned"]) => void;
  "list:updated": (payload: RealtimeEventMap["list:updated"]) => void;
  "item:added": (payload: RealtimeEventMap["item:added"]) => void;
  "item:updated": (payload: RealtimeEventMap["item:updated"]) => void;
  "item:deleted": (payload: RealtimeEventMap["item:deleted"]) => void;
}
