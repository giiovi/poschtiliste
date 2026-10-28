<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import {
  ApiError,
  createShoppingList,
  fetchShoppingList,
  UnauthenticatedError,
  updateShoppingList,
} from "../api/shopping-lists";
import { fetchUsers } from "../api/users";
import type { ShoppingListDetail } from "../types/shopping-list";
import type { UserOption } from "../types/user";

type FormState = "loading" | "ready" | "unavailable" | "error";
type FormField = "title" | "dueDate" | "responsibleUserId" | "assignedUserIds";

const MAX_TITLE_LENGTH = 255;

const props = defineProps<{ listId?: number; currentUserId: number }>();
const emit = defineEmits<{ saved: []; cancel: []; unauthenticated: [] }>();

const state = ref<FormState>("loading");
const users = ref<UserOption[]>([]);
const existingList = ref<ShoppingListDetail | null>(null);
const title = ref("");
const dueDate = ref("");
const responsibleUserId = ref(props.currentUserId);
const assignedUserIds = ref<number[]>([]);
const submitting = ref(false);
const fieldErrors = ref<Partial<Record<FormField, string>>>({});
const formError = ref("");

const isEditMode = computed(() => props.listId !== undefined);

function fieldForMessage(message: string): FormField | null {
  // backend validation messages start with the name of the invalid field
  if (message.startsWith("Title")) {
    return "title";
  }

  if (message.startsWith("Due date")) {
    return "dueDate";
  }

  if (message.startsWith("Responsible user")) {
    return "responsibleUserId";
  }

  if (message.startsWith("Assigned user") || message.startsWith("Unknown")) {
    return "assignedUserIds";
  }

  return null;
}

function handleError(error: unknown): boolean {
  if (error instanceof UnauthenticatedError) {
    emit("unauthenticated");
    return true;
  }

  return false;
}

async function load(): Promise<void> {
  state.value = "loading";

  try {
    const [loadedUsers, loadedList] = await Promise.all([
      fetchUsers(),
      props.listId === undefined
        ? Promise.resolve(null)
        : fetchShoppingList(props.listId),
    ]);

    users.value = loadedUsers;
    existingList.value = loadedList;

    if (loadedList) {
      title.value = loadedList.title;
      dueDate.value = loadedList.due_date ?? "";
      responsibleUserId.value = loadedList.responsible_user_id;
      assignedUserIds.value = [...loadedList.assigned_user_ids];
    }

    state.value = "ready";
  } catch (error) {
    if (handleError(error)) {
      return;
    }

    state.value =
      error instanceof ApiError && [403, 404].includes(error.status)
        ? "unavailable"
        : "error";
  }
}

async function refreshExistingList(): Promise<void> {
  // a failed update may have saved some steps, the next attempt needs the current state
  if (props.listId === undefined) {
    return;
  }

  try {
    existingList.value = await fetchShoppingList(props.listId);
  } catch {
    // keep the last known state, the save error is shown anyway
  }
}

async function submit(): Promise<void> {
  fieldErrors.value = {};
  formError.value = "";
  submitting.value = true;

  const input = {
    title: title.value,
    dueDate: dueDate.value === "" ? null : dueDate.value,
    responsibleUserId: responsibleUserId.value,
    assignedUserIds: assignedUserIds.value,
  };

  try {
    if (existingList.value) {
      await updateShoppingList(existingList.value, input);
    } else {
      await createShoppingList(input);
    }

    emit("saved");
  } catch (error) {
    if (handleError(error)) {
      return;
    }

    await refreshExistingList();

    if (error instanceof ApiError && error.status === 400) {
      const field = fieldForMessage(error.message);

      if (field) {
        fieldErrors.value = { [field]: error.message };
        return;
      }

      formError.value = error.message;
      return;
    }

    formError.value =
      error instanceof ApiError && error.status === 403
        ? "Du darfst diese Liste nicht bearbeiten."
        : "Die Liste konnte nicht gespeichert werden. Bitte versuche es erneut.";
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="list-form-card" aria-labelledby="list-form-title">
    <h2 id="list-form-title" class="list-form-card__title">
      {{ isEditMode ? "Liste bearbeiten" : "Neue Liste" }}
    </h2>

    <div
      v-if="state === 'loading'"
      class="list-form-card__skeleton"
      aria-busy="true"
      aria-label="Formular wird geladen"
    ></div>

    <p v-else-if="state === 'unavailable'" class="list-form-card__notice">
      Diese Liste gibt es nicht oder du hast keinen Zugriff darauf.
    </p>

    <div v-else-if="state === 'error'" class="list-form-card__notice">
      <p>Das Formular konnte nicht geladen werden.</p>
      <button type="button" class="list-form__secondary" @click="load">
        Erneut versuchen
      </button>
    </div>

    <form v-else class="list-form" novalidate @submit.prevent="submit">
      <p v-if="formError" class="list-form__error" role="alert">
        {{ formError }}
      </p>

      <label class="list-form__field">
        <span>Titel</span>
        <input
          v-model="title"
          name="title"
          type="text"
          :maxlength="MAX_TITLE_LENGTH"
          :aria-invalid="Boolean(fieldErrors.title)"
          aria-describedby="title-error"
        />
        <small
          v-if="fieldErrors.title"
          id="title-error"
          class="list-form__field-error"
          role="alert"
        >
          {{ fieldErrors.title }}
        </small>
      </label>

      <label class="list-form__field">
        <span>Fälligkeitsdatum</span>
        <input
          v-model="dueDate"
          name="dueDate"
          type="date"
          :aria-invalid="Boolean(fieldErrors.dueDate)"
          aria-describedby="due-date-error"
        />
        <small
          v-if="fieldErrors.dueDate"
          id="due-date-error"
          class="list-form__field-error"
          role="alert"
        >
          {{ fieldErrors.dueDate }}
        </small>
      </label>

      <label class="list-form__field">
        <span>Verantwortlich</span>
        <select
          v-model="responsibleUserId"
          name="responsibleUserId"
          :aria-invalid="Boolean(fieldErrors.responsibleUserId)"
          aria-describedby="responsible-error"
        >
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.username }}
          </option>
        </select>
        <small
          v-if="fieldErrors.responsibleUserId"
          id="responsible-error"
          class="list-form__field-error"
          role="alert"
        >
          {{ fieldErrors.responsibleUserId }}
        </small>
      </label>

      <fieldset class="list-form__field list-form__assignees">
        <legend>Zugewiesen</legend>
        <label v-for="user in users" :key="user.id" class="list-form__assignee">
          <input
            v-model="assignedUserIds"
            name="assignedUserIds"
            type="checkbox"
            :value="user.id"
          />
          <span>{{ user.username }}</span>
        </label>
        <small
          v-if="fieldErrors.assignedUserIds"
          class="list-form__field-error"
          role="alert"
        >
          {{ fieldErrors.assignedUserIds }}
        </small>
      </fieldset>

      <div class="list-form__actions">
        <button
          type="button"
          class="list-form__secondary"
          @click="emit('cancel')"
        >
          Abbrechen
        </button>
        <button class="list-form__submit" type="submit" :disabled="submitting">
          {{ submitting ? "Speichern …" : "Speichern" }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.list-form-card {
  display: grid;
  gap: 24px;
  width: min(100%, 560px);
  padding: clamp(20px, 6vw, 36px);
  border: 1px solid rgb(46 83 62 / 14%);
  background: #fff;
}

.list-form-card__title {
  color: #173e2b;
  font-size: clamp(1.5rem, 5vw, 2rem);
  font-weight: 650;
}

.list-form-card__skeleton {
  height: 320px;
  background: #eceee9;
}

.list-form-card__notice {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: start;
  color: #506158;
}

.list-form {
  display: grid;
  gap: 20px;
}

.list-form__field {
  display: grid;
  gap: 7px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  color: #32483b;
  font-weight: 600;
}

.list-form__field legend {
  margin-bottom: 7px;
  padding: 0;
}

.list-form__field input:not([type="checkbox"]),
.list-form__field select {
  width: 100%;
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid #9baaa1;
  border-radius: 0;
  background: #fff;
  color: #203128;
  font: inherit;
  font-weight: 400;
}

.list-form__field input:focus,
.list-form__field select:focus {
  border-color: #3e9b5b;
  outline: 3px solid rgb(62 155 91 / 22%);
}

.list-form__field [aria-invalid="true"] {
  border-color: #c8573b;
}

.list-form__assignees {
  gap: 0;
}

.list-form__assignee {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 44px;
  padding: 0 4px;
  border-bottom: 1px solid rgb(46 83 62 / 10%);
  font-weight: 400;
  cursor: pointer;
}

.list-form__assignee input {
  width: 20px;
  height: 20px;
  accent-color: #24623a;
}

.list-form__field-error {
  color: #833723;
  font-size: 0.9rem;
  font-weight: 400;
}

.list-form__error {
  padding: 12px 14px;
  border-left: 4px solid #c8573b;
  background: #fff1ed;
  color: #833723;
}

.list-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
}

.list-form__submit,
.list-form__secondary {
  min-height: 48px;
  padding: 0 24px;
  font-weight: 700;
  cursor: pointer;
}

.list-form__submit {
  border: 0;
  background: #24623a;
  color: #fff;
}

.list-form__submit:hover:not(:disabled) {
  background: #194c2c;
}

.list-form__submit:disabled {
  cursor: wait;
  opacity: 0.65;
}

.list-form__secondary {
  border: 1px solid rgb(46 83 62 / 24%);
  background: #fff;
  color: #24623a;
}

.list-form__secondary:hover {
  background: #eef3ee;
}

@media (max-width: 520px) {
  .list-form__actions {
    flex-direction: column-reverse;
  }

  .list-form__submit,
  .list-form__secondary {
    width: 100%;
  }
}
</style>
