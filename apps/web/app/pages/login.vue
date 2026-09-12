<script setup lang="ts">
definePageMeta({ layout: "auth" });

const client = useSupabaseClient();
const route = useRoute();
const { t } = useI18n();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

const redirectTarget = computed(() => {
  const value = Array.isArray(route.query.redirect)
    ? route.query.redirect[0]
    : route.query.redirect;
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
});

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
</script>

<template>
  <UContainer class="flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
    <div class="w-full max-w-sm">
      <UCard>
        <template #header>
          <div class="space-y-1">
            <h1 class="text-xl font-semibold tracking-tight text-highlighted">
              {{ t("auth.login.title") }}
            </h1>
            <p class="text-sm text-muted">{{ t("auth.login.subtitle") }}</p>
          </div>
        </template>

        <form class="grid gap-4" @submit.prevent="submit">
          <UFormField :label="t('auth.login.email')">
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
              type="password"
              autocomplete="current-password"
              icon="i-tabler-lock"
              class="w-full"
              required
              :disabled="loading"
            />
          </UFormField>

          <UAlert v-if="error" color="error" variant="subtle" :title="error" />

          <UButton type="submit" size="lg" block :loading="loading" :disabled="loading">
            {{ t("auth.login.submit") }}
          </UButton>
        </form>
      </UCard>

      <p class="mt-6 text-center text-sm text-muted">
        {{ t("auth.login.noAccount") }}
        <NuxtLink to="/signup" class="font-medium text-primary hover:underline">
          {{ t("auth.login.signup") }}
        </NuxtLink>
      </p>
    </div>
  </UContainer>
</template>
