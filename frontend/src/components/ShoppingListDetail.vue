<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import { ApiError, UnauthenticatedError } from "../api/http";
import {
  createShoppingItem,
  deleteShoppingItem,
  fetchShoppingItems,
  updateShoppingItem,
} from "../api/shopping-items";
import { fetchShoppingList } from "../api/shopping-lists";
import type { ShoppingItem } from "../types/shopping-item";
import type { ShoppingListDetail } from "../types/shopping-list";

type DetailState = "loading" | "ready" | "unavailable" | "error";

const props = defineProps<{ listId: number }>();
const emit = defineEmits<{ unauthenticated: [] }>();

const state = ref<DetailState>("loading");
const list = ref<ShoppingListDetail | null>(null);
const items = ref<ShoppingItem[]>([]);
const newName = ref("");
const newQuantity = ref(1);
const adding = ref(false);
const pendingItemId = ref<number | null>(null);
const editingItemId = ref<number | null>(null);
const editName = ref("");
const editQuantity = ref(1);
const actionError = ref("");

const purchasedCount = computed(
  () => items.value.filter((item) => item.purchased).length,
);

function handleUnauthenticated(error: unknown): boolean {
  if (error instanceof UnauthenticatedError) {
    emit("unauthenticated");
    return true;
  }

  return false;
}

function replaceItem(updatedItem: ShoppingItem): void {
  const index = items.value.findIndex((item) => item.id === updatedItem.id);

  if (index !== -1) {
    items.value[index] = updatedItem;
  }
}

async function load(): Promise<void> {
  state.value = "loading";
  actionError.value = "";

  try {
    const [loadedList, loadedItems] = await Promise.all([
      fetchShoppingList(props.listId),
      fetchShoppingItems(props.listId),
    ]);
    list.value = loadedList;
    items.value = loadedItems;
    state.value = "ready";
  } catch (error) {
    if (handleUnauthenticated(error)) {
      return;
    }

    state.value =
      error instanceof ApiError && [403, 404].includes(error.status)
        ? "unavailable"
        : "error";
  }
}

async function addItem(): Promise<void> {
  actionError.value = "";
  const name = newName.value.trim();

  if (
    name.length === 0 ||
    !Number.isSafeInteger(newQuantity.value) ||
    newQuantity.value < 1
  ) {
    actionError.value = "Bitte gib einen Namen und eine gültige Menge ein.";
    return;
  }

  adding.value = true;
  try {
    const createdItem = await createShoppingItem(props.listId, {
      name,
      quantity: newQuantity.value,
    });
    items.value.push(createdItem);
    newName.value = "";
    newQuantity.value = 1;
  } catch (error) {
    if (!handleUnauthenticated(error)) {
      actionError.value = "Der Artikel konnte nicht hinzugefügt werden.";
    }
  } finally {
    adding.value = false;
  }
}

function startEditing(item: ShoppingItem): void {
  actionError.value = "";
  editingItemId.value = item.id;
  editName.value = item.name;
  editQuantity.value = item.quantity;
}

function cancelEditing(): void {
  editingItemId.value = null;
}

async function saveItem(item: ShoppingItem): Promise<void> {
  actionError.value = "";
  const name = editName.value.trim();

  if (
    name.length === 0 ||
    !Number.isSafeInteger(editQuantity.value) ||
    editQuantity.value < 1
  ) {
    actionError.value = "Bitte gib einen Namen und eine gültige Menge ein.";
    return;
  }

  pendingItemId.value = item.id;
  try {
    replaceItem(
      await updateShoppingItem(props.listId, item.id, {
        name,
        quantity: editQuantity.value,
      }),
    );
    editingItemId.value = null;
  } catch (error) {
    if (!handleUnauthenticated(error)) {
      actionError.value = "Der Artikel konnte nicht gespeichert werden.";
    }
  } finally {
    pendingItemId.value = null;
  }
}

async function togglePurchased(
  item: ShoppingItem,
  event: Event,
): Promise<void> {
  actionError.value = "";
  const checkbox = event.target as HTMLInputElement;
  pendingItemId.value = item.id;

  try {
    replaceItem(
      await updateShoppingItem(props.listId, item.id, {
        purchased: checkbox.checked,
      }),
    );
  } catch (error) {
    checkbox.checked = item.purchased;
    if (!handleUnauthenticated(error)) {
      actionError.value = "Der Kaufstatus konnte nicht geändert werden.";
    }
  } finally {
    pendingItemId.value = null;
  }
}

async function removeItem(item: ShoppingItem): Promise<void> {
  if (!window.confirm(`„${item.name}“ wirklich löschen?`)) {
    return;
  }

  actionError.value = "";
  pendingItemId.value = item.id;
  try {
    await deleteShoppingItem(props.listId, item.id);
    items.value = items.value.filter((candidate) => candidate.id !== item.id);
  } catch (error) {
    if (!handleUnauthenticated(error)) {
      actionError.value = "Der Artikel konnte nicht gelöscht werden.";
    }
  } finally {
    pendingItemId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <section class="list-detail" aria-labelledby="list-detail-title">
    <div class="list-detail__navigation">
      <RouterLink :to="{ name: 'dashboard' }" class="list-detail__back">
        Zurück zu den Listen
      </RouterLink>
    </div>

    <div
      v-if="state === 'loading'"
      class="list-detail__skeleton"
      aria-busy="true"
      aria-label="Einkaufsliste wird geladen"
    ></div>

    <div v-else-if="state === 'unavailable'" class="list-detail__notice">
      <p>Diese Liste gibt es nicht oder du hast keinen Zugriff darauf.</p>
    </div>

    <div v-else-if="state === 'error'" class="list-detail__notice">
      <p>Die Einkaufsliste konnte nicht geladen werden.</p>
      <button type="button" class="list-detail__secondary" @click="load">
        Erneut versuchen
      </button>
    </div>

    <template v-else-if="list">
      <header class="list-detail__header">
        <div>
          <p class="label list-detail__eyebrow">Einkaufsliste</p>
          <h2 id="list-detail-title" class="list-detail__title">
            {{ list.title }}
          </h2>
          <p class="list-detail__progress" aria-live="polite">
            {{ purchasedCount }} von {{ items.length }} Artikeln eingekauft
          </p>
        </div>
        <RouterLink
          :to="{ name: 'list-edit', params: { id: list.id } }"
          class="list-detail__secondary"
        >
          Liste bearbeiten
        </RouterLink>
      </header>

      <form class="add-item" @submit.prevent="addItem">
        <label class="add-item__name">
          <span>Artikel</span>
          <input
            v-model="newName"
            name="newItemName"
            type="text"
            maxlength="255"
            required
            placeholder="z. B. Äpfel"
          />
        </label>
        <label class="add-item__quantity">
          <span>Menge</span>
          <input
            v-model.number="newQuantity"
            name="newItemQuantity"
            type="number"
            min="1"
            step="1"
            required
          />
        </label>
        <button type="submit" class="add-item__submit" :disabled="adding">
          {{ adding ? "Hinzufügen …" : "Hinzufügen" }}
        </button>
      </form>

      <p v-if="actionError" class="list-detail__error" role="alert">
        {{ actionError }}
      </p>

      <p v-if="items.length === 0" class="list-detail__empty">
        Noch keine Artikel. Füge oben den ersten hinzu.
      </p>

      <ul v-else class="item-list" aria-label="Einkaufsartikel">
        <li
          v-for="item in items"
          :key="item.id"
          class="item-row"
          :class="{ 'item-row--purchased': item.purchased }"
          :data-testid="`item-${item.id}`"
        >
          <template v-if="editingItemId === item.id">
            <form class="item-edit" @submit.prevent="saveItem(item)">
              <label class="item-edit__name">
                <span class="sr-only">Artikelname</span>
                <input
                  v-model="editName"
                  name="editItemName"
                  type="text"
                  maxlength="255"
                  required
                />
              </label>
              <label class="item-edit__quantity">
                <span class="sr-only">Menge</span>
                <input
                  v-model.number="editQuantity"
                  name="editItemQuantity"
                  type="number"
                  min="1"
                  step="1"
                  required
                />
              </label>
              <button
                type="button"
                class="item-row__button"
                @click="cancelEditing"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                class="item-row__button item-row__button--primary"
                :disabled="pendingItemId === item.id"
              >
                Speichern
              </button>
            </form>
          </template>

          <template v-else>
            <label class="item-row__check">
              <input
                type="checkbox"
                :checked="item.purchased"
                :disabled="pendingItemId === item.id"
                :aria-label="`${item.name} als eingekauft markieren`"
                @change="togglePurchased(item, $event)"
              />
            </label>
            <div class="item-row__content">
              <span class="item-row__name">{{ item.name }}</span>
              <span class="item-row__quantity">Menge: {{ item.quantity }}</span>
            </div>
            <div class="item-row__actions">
              <button
                type="button"
                class="item-row__button"
                :disabled="pendingItemId === item.id"
                :aria-label="`${item.name} bearbeiten`"
                @click="startEditing(item)"
              >
                Bearbeiten
              </button>
              <button
                type="button"
                class="item-row__button item-row__button--danger"
                :disabled="pendingItemId === item.id"
                :aria-label="`${item.name} löschen`"
                @click="removeItem(item)"
              >
                Löschen
              </button>
            </div>
          </template>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.list-detail {
  display: grid;
  gap: 20px;
  width: min(100%, 760px);
}

.list-detail__navigation {
  display: flex;
}

.list-detail__back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: #24623a;
  font-weight: 650;
}

.list-detail__skeleton {
  min-height: 360px;
  background: #eceee9;
}

.list-detail__notice,
.list-detail__empty {
  padding: 24px;
  border: 1px solid rgb(46 83 62 / 14%);
  background: #fff;
  color: #506158;
}

.list-detail__notice {
  display: grid;
  gap: 16px;
  justify-items: start;
}

.list-detail__header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: end;
  justify-content: space-between;
  padding: clamp(20px, 5vw, 32px);
  border-left: 4px solid #3e9b5b;
  background: #fff;
}

.list-detail__eyebrow {
  margin-bottom: 4px;
  color: #b15c28;
}

.list-detail__title {
  color: #173e2b;
  font-size: clamp(1.5rem, 6vw, 2.2rem);
  overflow-wrap: anywhere;
}

.list-detail__progress {
  margin-top: 8px;
  color: #506158;
}

.list-detail__secondary,
.item-row__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid rgb(46 83 62 / 24%);
  background: #fff;
  color: #24623a;
  font-weight: 650;
  text-decoration: none;
  cursor: pointer;
}

.add-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px auto;
  gap: 12px;
  align-items: end;
  padding: clamp(16px, 4vw, 24px);
  background: #fff;
}

.add-item label,
.item-edit label {
  display: grid;
  gap: 6px;
  color: #32483b;
  font-weight: 600;
}

.add-item input,
.item-edit input {
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

.add-item input:focus,
.item-edit input:focus {
  border-color: #3e9b5b;
  outline: 3px solid rgb(62 155 91 / 22%);
}

.add-item__submit {
  min-height: 48px;
  padding: 0 20px;
  border: 0;
  background: #24623a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.add-item__submit:disabled,
.item-row__button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.list-detail__error {
  padding: 12px 14px;
  border-left: 4px solid #c8573b;
  background: #fff1ed;
  color: #833723;
}

.item-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item-row {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 76px;
  padding: 12px 16px;
  border: 1px solid rgb(46 83 62 / 14%);
  background: #fff;
}

.item-row--purchased {
  background: #f0f2ef;
}

.item-row__check {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  cursor: pointer;
}

.item-row__check input {
  width: 28px;
  height: 28px;
  margin: 0;
  accent-color: #24623a;
}

.item-row__content {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.item-row__name {
  color: #203128;
  font-size: 1.05rem;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.item-row--purchased .item-row__name {
  color: #6b756f;
  text-decoration: line-through;
}

.item-row__quantity {
  color: #65736b;
  font-size: 0.9rem;
}

.item-row__actions {
  display: flex;
  gap: 8px;
}

.item-row__button--primary {
  border-color: #24623a;
  background: #24623a;
  color: #fff;
}

.item-row__button--danger {
  color: #9a3f29;
}

.item-edit {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: minmax(0, 1fr) 96px auto auto;
  gap: 8px;
  align-items: end;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .add-item {
    grid-template-columns: minmax(0, 1fr) 88px;
  }

  .add-item__submit {
    grid-column: 1 / -1;
    width: 100%;
  }

  .item-row {
    grid-template-columns: 48px minmax(0, 1fr);
    padding: 12px;
  }

  .item-row__actions {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .item-edit {
    grid-template-columns: minmax(0, 1fr) 84px;
  }

  .item-edit .item-row__button {
    width: 100%;
  }
}
</style>
