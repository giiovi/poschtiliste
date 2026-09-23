<script setup lang="ts">
import ShoppingListDashboard from "./components/ShoppingListDashboard.vue";
</script>

<template>
  <div class="app-shell">
    <header class="app-bar">
      <p class="label app-bar__eyebrow">Gemeinsam einkaufen</p>
      <h1 class="app-bar__title">Poschtilischte</h1>
    </header>

    <main class="app-main">
      <ShoppingListDashboard />
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
  padding: 24px clamp(16px, 5vw, 48px);
  border-bottom: 1px solid rgb(46 83 62 / 12%);
  background: #fff;
}

.app-bar__eyebrow {
  margin-bottom: 4px;
  color: #b15c28;
}

.app-bar__title {
  color: #173e2b;
  font-size: clamp(1.6rem, 6vw, 2.2rem);
  font-weight: 650;
  letter-spacing: -0.02em;
}

.app-main {
  display: flex;
  flex: 1;
  justify-content: center;
  padding: clamp(20px, 5vw, 40px) clamp(16px, 5vw, 48px) 48px;
}
</style>
