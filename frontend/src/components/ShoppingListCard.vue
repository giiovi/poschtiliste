<script setup lang="ts">
import { computed } from "vue";

import type { ShoppingList } from "../types/shopping-list";

const props = defineProps<{ list: ShoppingList }>();

const dateFormatter = new Intl.DateTimeFormat("de-CH", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function todayAsIsoDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

const isOverdue = computed(
  () =>
    !props.list.completed &&
    props.list.due_date !== null &&
    props.list.due_date < todayAsIsoDate(),
);

const status = computed(() => {
  if (props.list.completed) {
    return { modifier: "completed", label: "Abgeschlossen" };
  }

  if (isOverdue.value) {
    return { modifier: "overdue", label: "Überfällig" };
  }

  return { modifier: "open", label: "Offen" };
});

const formattedDueDate = computed(() => {
  if (props.list.due_date === null) {
    return "Kein Datum";
  }

  // the api delivers an iso date, the date constructor needs a full timestamp
  return dateFormatter.format(new Date(`${props.list.due_date}T00:00:00`));
});
</script>

<template>
  <article class="list-card" :class="`list-card--${status.modifier}`">
    <div class="list-card__header">
      <h3 class="list-card__title">{{ list.title }}</h3>
      <span class="list-card__status label">{{ status.label }}</span>
    </div>
    <p class="list-card__due-date">
      <span class="label list-card__due-date-label">Fällig</span>
      {{ formattedDueDate }}
    </p>
  </article>
</template>

<style scoped>
.list-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border: 1px solid rgb(46 83 62 / 14%);
  border-left: 4px solid var(--list-card-accent);
  background: #fff;
}

.list-card--open {
  --list-card-accent: #3e9b5b;
}

.list-card--overdue {
  --list-card-accent: #c8573b;
}

.list-card--completed {
  --list-card-accent: #9b9f9a;
  background: #f5f6f3;
}

.list-card__header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: start;
  justify-content: space-between;
}

.list-card__title {
  color: #173e2b;
  font-size: 1.15rem;
  font-weight: 650;
}

.list-card--completed .list-card__title {
  color: #5a6660;
}

.list-card__status {
  padding: 4px 12px;
  background: color-mix(in srgb, var(--list-card-accent) 16%, #fff);
  color: color-mix(in srgb, var(--list-card-accent) 78%, #000);
  white-space: nowrap;
}

.list-card__due-date {
  color: #506158;
  font-size: 0.95rem;
}

.list-card__due-date-label {
  margin-right: 6px;
  color: #7b8880;
}
</style>
