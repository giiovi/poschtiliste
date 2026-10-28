<script setup lang="ts">
import { ref } from "vue";

import {
  deleteAdminUser,
  describeAdminError,
  resetAdminUserPassword,
  UnauthenticatedError,
  updateAdminUser,
} from "../api/admin-users";
import type { AdminUser, UserRole } from "../types/user";

type RowMode = "view" | "edit" | "password" | "delete";

const props = defineProps<{ user: AdminUser; isCurrentUser: boolean }>();
const emit = defineEmits<{
  updated: [user: AdminUser];
  deleted: [id: number];
  unauthenticated: [];
}>();

const mode = ref<RowMode>("view");
const username = ref("");
const role = ref<UserRole>("user");
const password = ref("");
const busy = ref(false);
const error = ref("");
const notice = ref("");

function open(nextMode: RowMode): void {
  mode.value = nextMode;
  username.value = props.user.username;
  role.value = props.user.role;
  password.value = "";
  error.value = "";
  notice.value = "";
}

async function run(action: () => Promise<void>): Promise<void> {
  busy.value = true;
  error.value = "";

  try {
    await action();
  } catch (caught) {
    if (caught instanceof UnauthenticatedError) {
      emit("unauthenticated");
      return;
    }

    error.value = describeAdminError(caught);
  } finally {
    busy.value = false;
  }
}

function save(): Promise<void> {
  return run(async () => {
    const updated = await updateAdminUser(props.user.id, {
      username: username.value,
      role: role.value,
    });
    mode.value = "view";
    emit("updated", updated);
  });
}

function resetPassword(): Promise<void> {
  return run(async () => {
    await resetAdminUserPassword(props.user.id, password.value);
    mode.value = "view";
    notice.value = "Das Passwort wurde zurückgesetzt.";
  });
}

function remove(): Promise<void> {
  return run(async () => {
    await deleteAdminUser(props.user.id);
    emit("deleted", props.user.id);
  });
}
</script>

<template>
  <li class="user-row">
    <div class="user-row__summary">
      <span class="user-row__name">
        {{ user.username }}
        <span v-if="isCurrentUser" class="user-row__self">(du)</span>
      </span>
      <span
        class="user-row__role label"
        :class="{ 'user-row__role--admin': user.role === 'admin' }"
      >
        {{ user.role === "admin" ? "Admin" : "Benutzer" }}
      </span>
    </div>

    <p v-if="notice" class="user-row__notice" role="status">{{ notice }}</p>
    <p v-if="error" class="user-row__error" role="alert">{{ error }}</p>

    <div v-if="mode === 'view'" class="user-row__actions">
      <button type="button" class="button" @click="open('edit')">
        Bearbeiten
      </button>
      <button type="button" class="button" @click="open('password')">
        Passwort zurücksetzen
      </button>
      <button
        v-if="!isCurrentUser"
        type="button"
        class="button button--danger"
        @click="open('delete')"
      >
        Löschen
      </button>
    </div>

    <form
      v-else-if="mode === 'edit'"
      class="user-row__form"
      @submit.prevent="save"
    >
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
        <span>Rolle</span>
        <select v-model="role" name="role" :disabled="isCurrentUser">
          <option value="user">Benutzer</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <div class="user-row__actions">
        <button type="button" class="button" @click="mode = 'view'">
          Abbrechen
        </button>
        <button type="submit" class="button button--primary" :disabled="busy">
          Speichern
        </button>
      </div>
    </form>

    <form
      v-else-if="mode === 'password'"
      class="user-row__form"
      @submit.prevent="resetPassword"
    >
      <label class="field">
        <span>Neues Passwort</span>
        <input
          v-model="password"
          name="password"
          type="password"
          autocomplete="new-password"
          required
        />
      </label>
      <div class="user-row__actions">
        <button type="button" class="button" @click="mode = 'view'">
          Abbrechen
        </button>
        <button type="submit" class="button button--primary" :disabled="busy">
          Zurücksetzen
        </button>
      </div>
    </form>

    <div v-else class="user-row__form">
      <p>{{ user.username }} wirklich löschen?</p>
      <div class="user-row__actions">
        <button type="button" class="button" @click="mode = 'view'">
          Abbrechen
        </button>
        <button
          type="button"
          class="button button--danger"
          :disabled="busy"
          @click="remove"
        >
          Endgültig löschen
        </button>
      </div>
    </div>
  </li>
</template>

<style scoped>
.user-row {
  display: grid;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid rgb(46 83 62 / 14%);
  background: #fff;
}

.user-row__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  justify-content: space-between;
}

.user-row__name {
  color: #173e2b;
  font-size: 1.1rem;
  font-weight: 650;
}

.user-row__self {
  color: #7b8880;
  font-weight: 400;
}

.user-row__role {
  padding: 4px 12px;
  background: #e4ebe5;
  color: #35523f;
}

.user-row__role--admin {
  background: #f6e4d8;
  color: #8a4419;
}

.user-row__form {
  display: grid;
  gap: 14px;
}

.user-row__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.user-row__notice {
  color: #24623a;
}

.user-row__error {
  padding: 10px 12px;
  border-left: 4px solid #c8573b;
  background: #fff1ed;
  color: #833723;
}

@media (max-width: 520px) {
  .user-row__actions .button {
    flex: 1 1 100%;
  }
}
</style>
