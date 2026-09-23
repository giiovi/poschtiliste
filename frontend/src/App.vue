<script setup lang="ts">
import { ref } from "vue";
import { RouterView, useRouter } from "vue-router";

import { authSession } from "./auth/session";

const router = useRouter();
const loggingOut = ref(false);
const logoutError = ref("");

async function logout(): Promise<void> {
  logoutError.value = "";
  loggingOut.value = true;

  try {
    await authSession.logout();
    await router.replace({ name: "login" });
  } catch {
    logoutError.value = "Die Abmeldung ist fehlgeschlagen.";
  } finally {
    loggingOut.value = false;
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="app-bar">
      <p class="label app-bar__eyebrow">Gemeinsam einkaufen</p>
      <h1 class="app-bar__title">Poschtilischte</h1>
      <div v-if="authSession.currentUser.value" class="app-bar__session">
        <span>{{ authSession.currentUser.value.username }}</span>
        <button type="button" :disabled="loggingOut" @click="logout">
          {{ loggingOut ? "Abmelden …" : "Abmelden" }}
        </button>
      </div>
    </header>

    <main class="app-main">
      <p v-if="logoutError" class="app-error" role="alert">
        {{ logoutError }}
      </p>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-bar {
  display: grid;
  grid-template-columns: 1fr auto;
  padding: 24px clamp(16px, 5vw, 48px);
  border-bottom: 1px solid rgb(46 83 62 / 12%);
  background: #fff;
}

.app-bar__eyebrow {
  grid-column: 1;
  margin-bottom: 4px;
  color: #b15c28;
}

.app-bar__title {
  grid-column: 1;
  color: #173e2b;
  font-size: clamp(1.6rem, 6vw, 2.2rem);
  font-weight: 650;
  letter-spacing: -0.02em;
}

.app-bar__session {
  display: flex;
  grid-column: 2;
  grid-row: 1 / span 2;
  gap: 12px;
  align-items: center;
  color: #506158;
}

.app-bar__session button {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgb(46 83 62 / 24%);
  background: #fff;
  color: #24623a;
  font-weight: 650;
  cursor: pointer;
}

.app-bar__session button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.app-main {
  position: relative;
  display: flex;
  flex: 1;
  justify-content: center;
  padding: clamp(20px, 5vw, 40px) clamp(16px, 5vw, 48px) 48px;
}

.app-error {
  position: absolute;
  top: 8px;
  padding: 10px 14px;
  background: #fff1ed;
  color: #833723;
}

@media (max-width: 520px) {
  .app-bar {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .app-bar__session {
    grid-column: 1;
    grid-row: auto;
    justify-content: space-between;
  }
}
</style>
