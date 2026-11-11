<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { authSession } from "../auth/session";
import ShoppingListDetail from "../components/ShoppingListDetail.vue";

const route = useRoute();
const router = useRouter();

const listId = computed(() => Number(route.params.id));

async function handleUnauthenticated(): Promise<void> {
  authSession.clear();
  await router.replace({ name: "login" });
}
</script>

<template>
  <ShoppingListDetail
    :key="route.fullPath"
    :list-id="listId"
    @unauthenticated="handleUnauthenticated"
  />
</template>
