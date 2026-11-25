<script setup lang="ts">
import { networkStatus } from "../offline/network-status";
</script>

<template>
  <p v-if="!networkStatus.online.value" class="offline-banner" role="status">
    Du bist offline. Bereits geladene Listen bleiben lesbar, Änderungen sind
    erst wieder mit Verbindung möglich.
  </p>
</template>

<style scoped>
.offline-banner {
  padding: 10px clamp(16px, 5vw, 48px);
  border-bottom: 1px solid rgb(177 92 40 / 24%);
  background: #fff4e5;
  color: #6b3a12;
  font-weight: 600;
}
</style>
