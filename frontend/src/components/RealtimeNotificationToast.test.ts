import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { RealtimeEvent } from "../realtime/events";
import RealtimeNotificationToast from "./RealtimeNotificationToast.vue";

const realtime = vi.hoisted(() => ({
  listener: undefined as ((event: RealtimeEvent) => void) | undefined,
  unsubscribe: vi.fn(),
  subscribeRealtime: vi.fn(),
}));

vi.mock("../realtime/socket", () => ({
  subscribeRealtime: realtime.subscribeRealtime,
}));

describe("RealtimeNotificationToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    realtime.subscribeRealtime.mockImplementation((listener) => {
      realtime.listener = listener;
      return realtime.unsubscribe;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("shows a non-blocking message and dismisses it automatically", async () => {
    const wrapper = mount(RealtimeNotificationToast);

    realtime.listener?.({
      name: "item:added",
      payload: {
        listId: 7,
        actorUserId: 3,
        item: {
          id: 4,
          shopping_list_id: 7,
          name: "Milch",
          quantity: 1,
          purchased: false,
          created_at: "2026-11-04 10:00:00",
          updated_at: "2026-11-04 10:00:00",
        },
      },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[role="status"]').text()).toContain(
      "„Milch“ wurde hinzugefügt.",
    );

    vi.advanceTimersByTime(4_000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);

    wrapper.unmount();
    expect(realtime.unsubscribe).toHaveBeenCalledOnce();
  });
});
