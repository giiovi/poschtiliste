<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { InvalidCredentialsError } from "../api/auth";
import { authSession } from "../auth/session";

const route = useRoute();
const router = useRouter();
const username = ref("");
const password = ref("");
const submitting = ref(false);
const submitError = ref("");

const initialError = computed(() =>
  route.query.reason === "unavailable"
    ? "Die Verbindung zum Server ist momentan nicht möglich."
    : "",
);

async function submit(): Promise<void> {
  submitError.value = "";
  submitting.value = true;

  try {
    await authSession.login(username.value.trim(), password.value);
    const redirect =
      typeof route.query.redirect === "string" ? route.query.redirect : "/";
    await router.replace(redirect);
  } catch (error) {
    submitError.value =
      error instanceof InvalidCredentialsError
        ? "Benutzername oder Passwort ist falsch."
        : "Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="login-card" aria-labelledby="login-title">
    <div>
      <p class="label login-card__eyebrow">Willkommen zurück</p>
      <h2 id="login-title" class="login-card__title">Anmelden</h2>
      <p class="login-card__intro">
        Melde dich an, um deine Einkaufslisten zu verwalten.
      </p>
    </div>

    <p
      v-if="submitError || initialError"
      class="login-card__error"
      role="alert"
    >
      {{ submitError || initialError }}
    </p>

    <form class="login-form" @submit.prevent="submit">
      <label class="login-form__field">
        <span>Benutzername</span>
        <input
          v-model="username"
          name="username"
          type="text"
          autocomplete="username"
          required
          autofocus
        />
      </label>

      <label class="login-form__field">
        <span>Passwort</span>
        <input
          v-model="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </label>

      <button class="login-form__submit" type="submit" :disabled="submitting">
        {{ submitting ? "Anmeldung läuft …" : "Anmelden" }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.login-card {
  display: grid;
  gap: 24px;
  width: min(100%, 440px);
  padding: clamp(24px, 6vw, 40px);
  border: 1px solid rgb(46 83 62 / 14%);
  background: #fff;
  box-shadow: 0 18px 50px rgb(23 62 43 / 8%);
}

.login-card__eyebrow {
  margin-bottom: 6px;
  color: #b15c28;
}

.login-card__title {
  color: #173e2b;
  font-size: clamp(1.7rem, 7vw, 2.2rem);
  font-weight: 650;
}

.login-card__intro {
  margin-top: 8px;
  color: #5d6d64;
  line-height: 1.5;
}

.login-card__error {
  padding: 12px 14px;
  border-left: 4px solid #c8573b;
  background: #fff1ed;
  color: #833723;
}

.login-form,
.login-form__field {
  display: grid;
  gap: 16px;
}

.login-form__field {
  gap: 7px;
  color: #32483b;
  font-weight: 600;
}

.login-form__field input {
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid #9baaa1;
  border-radius: 0;
  color: #203128;
  font: inherit;
}

.login-form__field input:focus {
  border-color: #3e9b5b;
  outline: 3px solid rgb(62 155 91 / 22%);
}

.login-form__submit {
  min-height: 48px;
  margin-top: 4px;
  border: 0;
  background: #24623a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.login-form__submit:hover:not(:disabled) {
  background: #194c2c;
}

.login-form__submit:disabled {
  cursor: wait;
  opacity: 0.65;
}
</style>
