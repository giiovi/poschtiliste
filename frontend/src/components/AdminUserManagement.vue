<script setup lang="ts">
import { onMounted, ref } from "vue";

import {
  createAdminUser,
  describeAdminError,
  fetchAdminUsers,
  UnauthenticatedError,
} from "../api/admin-users";
import type { AdminUser, UserRole } from "../types/user";
import AdminUserRow from "./AdminUserRow.vue";

defineProps<{ currentUserId: number }>();
const emit = defineEmits<{ unauthenticated: [] }>();

const state = ref<"loading" | "ready" | "error">("loading");
const users = ref<AdminUser[]>([]);
const username = ref("");
const password = ref("");
const role = ref<UserRole>("user");
const creating = ref(false);
const createError = ref("");

function sortByUsername(list: AdminUser[]): AdminUser[] {
  return [...list].sort((first, second) =>
    first.username.localeCompare(second.username),
  );
}

async function load(): Promise<void> {
  state.value = "loading";

  try {
    users.value = await fetchAdminUsers();
    state.value = "ready";
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      emit("unauthenticated");
      return;
    }

    state.value = "error";
  }
}

async function create(): Promise<void> {
  creating.value = true;
  createError.value = "";

  try {
    const created = await createAdminUser({
      username: username.value,
      password: password.value,
      role: role.value,
    });
    users.value = sortByUsername([...users.value, created]);
    username.value = "";
    password.value = "";
    role.value = "user";
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      emit("unauthenticated");
      return;
    }

    createError.value = describeAdminError(error);
  } finally {
    creating.value = false;
  }
}

function replaceUser(updated: AdminUser): void {
  users.value = sortByUsername(
    users.value.map((user) => (user.id === updated.id ? updated : user)),
  );
}

function removeUser(id: number): void {
  users.value = users.value.filter((user) => user.id !== id);
}

onMounted(load);
</script>

<template>
  <section class="admin-users" aria-labelledby="admin-users-title">
    <h2 id="admin-users-title" class="admin-users__title">Benutzer</h2>

    <form class="admin-users__create" @submit.prevent="create">
      <h3 class="label">Neuer Benutzer</h3>
      <p v-if="createError" class="admin-users__error" role="alert">
        {{ createError }}
      </p>
      <div class="admin-users__fields">
        <label class="field">
          <span>Benutzername</span>
          <input
            v-model="username"
            name="username"
            type="text"
            autocomplete="off"
            required
          />
        </label>
        <label class="field">
          <span>Passwort</span>
          <input
            v-model="password"
            name="password"
            type="password"
            autocomplete="new-password"
            required
          />
        </label>
        <label class="field">
          <span>Rolle</span>
          <select v-model="role" name="role">
            <option value="user">Benutzer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>
      <button type="submit" class="button button--primary" :disabled="creating">
        {{ creating ? "Anlegen …" : "Anlegen" }}
      </button>
    </form>

    <div
      v-if="state === 'loading'"
      class="admin-users__skeleton"
      aria-busy="true"
      aria-label="Benutzer werden geladen"
    ></div>

    <div v-else-if="state === 'error'" class="admin-users__notice">
      <p>Die Benutzer konnten nicht geladen werden.</p>
      <button type="button" class="button" @click="load">
        Erneut versuchen
      </button>
    </div>

    <ul v-else class="admin-users__list">
      <AdminUserRow
        v-for="user in users"
        :key="user.id"
        :user="user"
        :is-current-user="user.id === currentUserId"
        @updated="replaceUser"
        @deleted="removeUser"
        @unauthenticated="emit('unauthenticated')"
      />
    </ul>
  </section>
</template>

<style scoped>
.admin-users {
  display: grid;
  gap: 24px;
  width: min(100%, 760px);
  align-content: start;
}

.admin-users__title {
  color: #173e2b;
  font-size: clamp(1.5rem, 5vw, 2rem);
  font-weight: 650;
}

.admin-users__create {
  display: grid;
  gap: 16px;
  padding: clamp(20px, 5vw, 28px);
  border: 1px solid rgb(46 83 62 / 14%);
  background: #fff;
}

.admin-users__create .button {
  justify-self: end;
}

.admin-users__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.admin-users__error {
  padding: 10px 12px;
  border-left: 4px solid #c8573b;
  background: #fff1ed;
  color: #833723;
}

.admin-users__skeleton {
  height: 240px;
  background: #eceee9;
}

.admin-users__notice {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: start;
  color: #506158;
}

.admin-users__list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 520px) {
  .admin-users__create .button {
    justify-self: stretch;
  }
}
</style>
