<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { authSession } from "../auth/session";
import ShoppingListForm from "../components/ShoppingListForm.vue";

const route = useRoute();
const router = useRouter();

const listId = computed(() =>
  typeof route.params.id === "string" ? Number(route.params.id) : undefined,
);

async function openDashboard(): Promise<void> {
  await router.push({ name: "dashboard" });
}

async function handleUnauthenticated(): Promise<void> {
  authSession.clear();
  await router.replace({ name: "login" });
}
</script>

<template>
  <ShoppingListForm
    v-if="authSession.currentUser.value"
    :key="route.fullPath"
    :list-id="listId"
    :current-user-id="authSession.currentUser.value.id"
    @saved="openDashboard"
    @cancel="openDashboard"
    @unauthenticated="handleUnauthenticated"
  />
</template>
