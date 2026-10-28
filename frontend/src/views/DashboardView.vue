<script setup lang="ts">
import { useRouter } from "vue-router";

import { authSession } from "../auth/session";
import ShoppingListDashboard from "../components/ShoppingListDashboard.vue";

const router = useRouter();

async function handleUnauthenticated(): Promise<void> {
  authSession.clear();
  await router.replace({ name: "login" });
}
</script>

<template>
  <ShoppingListDashboard @unauthenticated="handleUnauthenticated" />
</template>
