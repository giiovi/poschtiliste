import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, test } from "vitest";

import OfflineBanner from "./OfflineBanner.vue";

describe("OfflineBanner", () => {
  afterEach(() => {
    window.dispatchEvent(new Event("online"));
  });

  test("is hidden while the browser is online", () => {
    const wrapper = mount(OfflineBanner);

    expect(wrapper.find("[role='status']").exists()).toBe(false);
  });

  test("appears when the connection drops and hides again once it is back", async () => {
    const wrapper = mount(OfflineBanner);

    window.dispatchEvent(new Event("offline"));
    await nextTick();
    expect(wrapper.get("[role='status']").text()).toContain("offline");

    window.dispatchEvent(new Event("online"));
    await nextTick();
    expect(wrapper.find("[role='status']").exists()).toBe(false);
  });
});
