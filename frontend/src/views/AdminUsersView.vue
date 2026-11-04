<script setup lang="ts">
import { useRouter } from "vue-router";

import { authSession } from "../auth/session";
import AdminUserManagement from "../components/AdminUserManagement.vue";

const router = useRouter();

async function handleUnauthenticated(): Promise<void> {
  authSession.clear();
  await router.replace({ name: "login" });
}
</script>

<template>
  <AdminUserManagement
    v-if="authSession.currentUser.value"
    :current-user-id="authSession.currentUser.value.id"
    @unauthenticated="handleUnauthenticated"
  />
</template>
