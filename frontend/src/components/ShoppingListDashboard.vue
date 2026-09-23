<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import {
  fetchShoppingLists,
  UnauthenticatedError,
} from "../api/shopping-lists";
import type { ShoppingList } from "../types/shopping-list";
import ShoppingListCard from "./ShoppingListCard.vue";

type DashboardState = "loading" | "ready" | "unauthenticated" | "error";

const SKELETON_CARDS = 3;

const state = ref<DashboardState>("loading");
const shoppingLists = ref<ShoppingList[]>([]);

function byDueDate(first: ShoppingList, second: ShoppingList): number {
  // lists without a due date belong at the end
  if (first.due_date === null) {
    return second.due_date === null ? first.id - second.id : 1;
  }

  if (second.due_date === null) {
    return -1;
  }

  return first.due_date.localeCompare(second.due_date);
}

const openLists = computed(() =>
  shoppingLists.value.filter((list) => !list.completed).sort(byDueDate),
);

const completedLists = computed(() =>
  shoppingLists.value.filter((list) => list.completed).sort(byDueDate),
);

const isEmpty = computed(
  () => state.value === "ready" && shoppingLists.value.length === 0,
);

async function loadShoppingLists(): Promise<void> {
  state.value = "loading";

  try {
    shoppingLists.value = await fetchShoppingLists();
    state.value = "ready";
  } catch (error) {
    state.value =
      error instanceof UnauthenticatedError ? "unauthenticated" : "error";
  }
}

onMounted(loadShoppingLists);
</script>

<template>
  <section class="dashboard" aria-labelledby="dashboard-title">
    <header class="dashboard__header">
      <h2 id="dashboard-title" class="dashboard__title">
        Meine Einkaufslisten
      </h2>
      <button
        v-if="state === 'ready'"
        type="button"
        class="dashboard__refresh"
        @click="loadShoppingLists"
      >
        Aktualisieren
      </button>
    </header>

    <div
      v-if="state === 'loading'"
      class="dashboard__skeletons"
      aria-busy="true"
      aria-label="Einkaufslisten werden geladen"
    >
      <div
        v-for="index in SKELETON_CARDS"
        :key="index"
        class="dashboard__skeleton"
      ></div>
    </div>

    <p v-else-if="state === 'unauthenticated'" class="dashboard__notice">
      Bitte melde dich an, um deine Einkaufslisten zu sehen.
    </p>

    <div v-else-if="state === 'error'" class="dashboard__notice">
      <p>Die Einkaufslisten konnten nicht geladen werden.</p>
      <button
        type="button"
        class="dashboard__refresh"
        @click="loadShoppingLists"
      >
        Erneut versuchen
      </button>
    </div>

    <p v-else-if="isEmpty" class="dashboard__notice">
      Dir ist noch keine Einkaufsliste zugewiesen.
    </p>

    <template v-else>
      <section
        v-if="openLists.length > 0"
        class="dashboard__group"
        aria-labelledby="open-lists-title"
      >
        <h3 id="open-lists-title" class="dashboard__group-title label">
          Offen <span class="dashboard__count">{{ openLists.length }}</span>
        </h3>
        <div class="dashboard__cards">
          <ShoppingListCard
            v-for="list in openLists"
            :key="list.id"
            :list="list"
          />
        </div>
      </section>

      <section
        v-if="completedLists.length > 0"
        class="dashboard__group"
        aria-labelledby="completed-lists-title"
      >
        <h3 id="completed-lists-title" class="dashboard__group-title label">
          Abgeschlossen
          <span class="dashboard__count">{{ completedLists.length }}</span>
        </h3>
        <div class="dashboard__cards">
          <ShoppingListCard
            v-for="list in completedLists"
            :key="list.id"
            :list="list"
          />
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: min(100%, 880px);
}

.dashboard__header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  align-items: center;
  justify-content: space-between;
}

.dashboard__title {
  color: #173e2b;
  font-size: clamp(1.5rem, 5vw, 2rem);
  font-weight: 650;
}

.dashboard__refresh {
  min-height: 44px;
  padding: 0 20px;
  border: 1px solid rgb(46 83 62 / 24%);
  background: #fff;
  color: #24623a;
  font-weight: 650;
  cursor: pointer;
}

.dashboard__refresh:hover {
  background: #eef3ee;
}

.dashboard__skeletons,
.dashboard__cards,
.dashboard__group {
  display: grid;
  gap: 12px;
}

.dashboard__skeleton {
  height: 104px;
  background: #eceee9;
}

.dashboard__notice {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: start;
  padding: 24px;
  border: 1px solid rgb(46 83 62 / 24%);
  background: #fff;
  color: #506158;
}

.dashboard__group-title {
  display: flex;
  gap: 10px;
  align-items: center;
  color: #4b5b52;
}

.dashboard__count {
  min-width: 26px;
  padding: 0 8px;
  background: #e4ebe5;
  color: #35523f;
  text-align: center;
}
</style>
