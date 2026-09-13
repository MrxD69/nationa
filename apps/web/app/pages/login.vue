<script setup lang="ts">
definePageMeta({ layout: "auth" });

const client = useSupabaseClient();
const route = useRoute();
const { t } = useI18n();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref<string | null>(null);
const showPassword = ref(false);

const forgotOpen = ref(false);
const forgotLoading = ref(false);
const forgotState = ref<"idle" | "sent" | "error">("idle");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailValid = computed(() => EMAIL_RE.test(email.value.trim()));
const emailError = computed(() =>
  email.value.length > 0 && !emailValid.value ? t("auth.login.invalidEmail") : undefined,
);

const redirectTarget = computed(() => {
  const value = Array.isArray(route.query.redirect)
    ? route.query.redirect[0]
    : route.query.redirect;
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
});

function toggleForgot() {
  forgotOpen.value = !forgotOpen.value;
  forgotState.value = "idle";
}

async function submit() {
  loading.value = true;
  error.value = null;

  try {
    const { error: authError } = await client.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (authError) {
      throw authError;
    }

    await navigateTo(redirectTarget.value);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t("auth.login.errors.generic");
  } finally {
    loading.value = false;
  }
}

async function submitForgot() {
  if (!emailValid.value) {
    return;
  }

  forgotLoading.value = true;
  forgotState.value = "idle";

  try {
    const { error: resetError } = await client.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (resetError) {
      throw resetError;
    }
    forgotState.value = "sent";
  } catch {
    forgotState.value = "error";
  } finally {
    forgotLoading.value = false;
  }
}
</script>

<template>
  <div class="w-full max-w-sm space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
        {{ t("auth.login.title") }}
      </h1>
      <p class="text-base text-muted">{{ t("auth.login.subtitle") }}</p>
    </div>

    <form class="grid gap-4" @submit.prevent="submit">
      <UFormField :label="t('auth.login.email')" :error="emailError">
        <UInput
          v-model="email"
          type="email"
          autocomplete="email"
          icon="i-tabler-mail"
          :placeholder="t('auth.login.emailPlaceholder')"
          class="w-full"
          required
          :disabled="loading"
        />
      </UFormField>

      <UFormField :label="t('auth.login.password')">
        <UInput
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          icon="i-tabler-lock"
          class="w-full"
          required
          :disabled="loading"
        >
          <template #trailing>
            <button
              type="button"
              class="flex items-center rounded-md text-muted transition-colors hover:text-highlighted"
              :aria-label="
                showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')
              "
              @click="showPassword = !showPassword"
            >
              <UIcon :name="showPassword ? 'i-tabler-eye-off' : 'i-tabler-eye'" class="size-5" />
            </button>
          </template>
        </UInput>
      </UFormField>

      <UAlert v-if="error" color="error" variant="subtle" :title="error" />

      <UButton type="submit" block :loading="loading" :disabled="loading || !emailValid">
        {{ t("auth.login.submit") }}
      </UButton>

      <UButton
        type="button"
        variant="link"
        color="neutral"
        block
        :label="t('auth.login.forgot')"
        @click="toggleForgot"
      />
    </form>

    <div v-if="forgotOpen" class="space-y-3 border-t border-default pt-6">
      <div class="space-y-1">
        <p class="text-base font-semibold text-highlighted">{{ t("auth.login.forgotTitle") }}</p>
        <p class="text-sm text-muted">{{ t("auth.login.forgotHelp") }}</p>
      </div>

      <UFormField :label="t('auth.login.email')" :error="emailError">
        <UInput
          v-model="email"
          type="email"
          autocomplete="email"
          icon="i-tabler-mail"
          :placeholder="t('auth.login.emailPlaceholder')"
          class="w-full"
          :disabled="forgotLoading"
        />
      </UFormField>

      <UAlert
        v-if="forgotState === 'sent'"
        color="success"
        variant="subtle"
        :title="t('auth.login.forgotSent')"
      />
      <UAlert
        v-else-if="forgotState === 'error'"
        color="error"
        variant="subtle"
        :title="t('auth.login.forgotError')"
      />

      <div class="flex flex-wrap items-center justify-end gap-2">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          :label="t('auth.login.back')"
          @click="toggleForgot"
        />
        <UButton
          type="button"
          icon="i-tabler-send"
          :loading="forgotLoading"
          :disabled="forgotLoading || !emailValid"
          :label="t('auth.login.forgotSubmit')"
          @click="submitForgot"
        />
      </div>
    </div>

    <p class="text-center text-base text-muted">
      {{ t("auth.login.noAccount") }}
      <NuxtLink to="/signup" class="font-medium text-primary hover:underline">
        {{ t("auth.login.signup") }}
      </NuxtLink>
    </p>
  </div>
</template>
