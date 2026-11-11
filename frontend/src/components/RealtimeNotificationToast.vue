<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

import type { RealtimeEvent } from "../realtime/events";
import { subscribeRealtime } from "../realtime/socket";

const DISPLAY_TIME_MS = 4_000;
const message = ref("");
let dismissTimer: ReturnType<typeof setTimeout> | undefined;
let unsubscribe: (() => void) | undefined;

function describe(event: RealtimeEvent): string {
  switch (event.name) {
    case "list:assigned":
      return "Eine Einkaufslistenzuweisung wurde aktualisiert.";
    case "list:updated":
      return event.payload.change === "deleted"
        ? "Eine Einkaufsliste wurde gelöscht."
        : "Eine Einkaufsliste wurde aktualisiert.";
    case "item:added":
      return `„${event.payload.item.name}“ wurde hinzugefügt.`;
    case "item:updated":
      return `„${event.payload.item.name}“ wurde aktualisiert.`;
    case "item:deleted":
      return "Ein Artikel wurde gelöscht.";
  }
}

function show(event: RealtimeEvent): void {
  message.value = describe(event);
  clearTimeout(dismissTimer);
  dismissTimer = setTimeout(() => {
    message.value = "";
  }, DISPLAY_TIME_MS);
}

onMounted(() => {
  unsubscribe = subscribeRealtime(show);
});

onUnmounted(() => {
  unsubscribe?.();
  clearTimeout(dismissTimer);
});
</script>

<template>
  <Transition name="toast">
    <aside
      v-if="message"
      class="realtime-toast"
      role="status"
      aria-live="polite"
    >
      <span>{{ message }}</span>
      <button
        type="button"
        aria-label="Benachrichtigung schliessen"
        @click="message = ''"
      >
        ×
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.realtime-toast {
  position: fixed;
  z-index: 10;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(16px, env(safe-area-inset-bottom));
  display: flex;
  gap: 16px;
  align-items: center;
  max-width: min(420px, calc(100vw - 32px));
  padding: 14px 16px;
  border-left: 4px solid #3e9b5b;
  box-shadow: 0 8px 28px rgb(25 55 37 / 20%);
  background: #173e2b;
  color: #fff;
}

.realtime-toast button {
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 1.5rem;
  cursor: pointer;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
