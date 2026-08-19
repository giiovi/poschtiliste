<script setup lang="ts">
import { onMounted, ref } from "vue";

type ConnectionState = "checking" | "connected" | "unavailable";

const connectionState = ref<ConnectionState>("checking");

onMounted(async () => {
  try {
    const response = await fetch("/api/health");
    const data: unknown = await response.json();

    connectionState.value =
      response.ok &&
      typeof data === "object" &&
      data !== null &&
      "status" in data &&
      data.status === "ok"
        ? "connected"
        : "unavailable";
  } catch {
    connectionState.value = "unavailable";
  }
});
</script>

<template>
  <main class="page-shell">
    <section class="hero" aria-labelledby="page-title">
      <p class="eyebrow">Gemeinsam einkaufen</p>
      <h1 id="page-title">Poschtilischte</h1>
      <p class="intro">
        Einkaufslisten gemeinsam planen, Produkte abhaken und nichts mehr
        vergessen.
      </p>

      <div class="status" :class="`status--${connectionState}`" role="status">
        <span class="status__dot" aria-hidden="true"></span>
        <span v-if="connectionState === 'checking'">Backend wird geprüft …</span>
        <span v-else-if="connectionState === 'connected'">Backend verbunden</span>
        <span v-else>Backend nicht erreichbar</span>
      </div>
    </section>
  </main>
</template>
