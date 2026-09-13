<script setup lang="ts">
definePageMeta({ layout: "auth" });

type Choice = "has_company" | "no_company" | "accountant";
type AccountType = "owner" | "accountant";

const client = useSupabaseClient();
const { t } = useI18n();

const email = ref("");
const password = ref("");
const choice = ref<Choice | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const awaitingConfirmation = ref(false);

const roles = computed(() => [
  {
    value: "has_company" as Choice,
    accountType: "owner" as AccountType,
    icon: "i-tabler-building-skyscraper",
    title: t("auth.signup.roles.has_company.title"),
    description: t("auth.signup.roles.has_company.description"),
  },
  {
    value: "no_company" as Choice,
    accountType: "owner" as AccountType,
    icon: "i-tabler-square-plus",
    title: t("auth.signup.roles.no_company.title"),
    description: t("auth.signup.roles.no_company.description"),
  },
  {
    value: "accountant" as Choice,
    accountType: "accountant" as AccountType,
    icon: "i-tabler-scale",
    title: t("auth.signup.roles.accountant.title"),
    description: t("auth.signup.roles.accountant.description"),
  },
]);

async function submit() {
  error.value = null;

  const selected = roles.value.find((role) => role.value === choice.value);
  if (!selected) {
    error.value = t("auth.signup.errors.roleRequired");
    return;
  }

  loading.value = true;
  try {
    const { data, error: authError } = await client.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          accountType: selected.accountType,
          choice: selected.value,
        },
      },
    });

    if (authError) {
      throw authError;
    }

    if (data.session) {
      await navigateTo("/");
      return;
    }

    awaitingConfirmation.value = true;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t("auth.signup.errors.generic");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UContainer class="flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
    <div class="w-full max-w-xl">
      <UCard v-if="awaitingConfirmation">
        <div class="flex flex-col items-center gap-4 py-4 text-center">
          <span
            class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <UIcon name="i-tabler-mail-check" class="size-7" />
          </span>
          <div class="space-y-1">
            <h1 class="text-lg font-semibold text-highlighted">
              {{ t("auth.signup.checkEmail.title") }}
            </h1>
            <p class="text-base text-muted">
              {{ t("auth.signup.checkEmail.description", { email }) }}
            </p>
          </div>
          <UButton
            to="/login"
            color="neutral"
            variant="soft"
            block
            :label="t('auth.signup.checkEmail.backToLogin')"
          />
        </div>
      </UCard>

      <template v-else>
        <UCard>
          <template #header>
            <div class="space-y-1">
              <h1 class="text-xl font-semibold tracking-tight text-highlighted">
                {{ t("auth.signup.title") }}
              </h1>
              <p class="text-base text-muted">{{ t("auth.signup.subtitle") }}</p>
            </div>
          </template>

          <form class="grid gap-6" @submit.prevent="submit">
            <div class="space-y-3">
              <p class="text-base font-medium text-highlighted">
                {{ t("auth.signup.roleTitle") }}
              </p>
              <div class="grid gap-3 sm:grid-cols-3">
                <button
                  v-for="role in roles"
                  :key="role.value"
                  type="button"
                  class="flex flex-col items-start gap-3 rounded-xl border p-4 text-start transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  :class="
                    choice === role.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-default bg-default hover:border-accented hover:bg-elevated'
                  "
                  :aria-pressed="choice === role.value"
                  :disabled="loading"
                  @click="choice = role.value"
                >
                  <span
                    class="flex size-10 items-center justify-center rounded-lg"
                    :class="
                      choice === role.value ? 'bg-primary text-inverted' : 'bg-elevated text-toned'
                    "
                  >
                    <UIcon :name="role.icon" class="size-6" />
                  </span>
                  <span class="space-y-1">
                    <span class="block text-base font-semibold text-highlighted">
                      {{ role.title }}
                    </span>
                    <span class="block text-sm leading-relaxed text-muted">
                      {{ role.description }}
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <UFormField :label="t('auth.signup.email')">
              <UInput
                v-model="email"
                type="email"
                autocomplete="email"
                icon="i-tabler-mail"
                :placeholder="t('auth.signup.emailPlaceholder')"
                class="w-full"
                required
                :disabled="loading"
              />
            </UFormField>

            <UFormField :label="t('auth.signup.password')" :hint="t('auth.signup.passwordHint')">
              <UInput
                v-model="password"
                type="password"
                autocomplete="new-password"
                icon="i-tabler-lock"
                class="w-full"
                required
                minlength="8"
                :disabled="loading"
              />
            </UFormField>

            <UAlert v-if="error" color="error" variant="subtle" :title="error" />

            <UButton type="submit" size="lg" block :loading="loading" :disabled="loading">
              {{ t("auth.signup.submit") }}
            </UButton>
          </form>
        </UCard>

        <p class="mt-6 text-center text-base text-muted">
          {{ t("auth.signup.haveAccount") }}
          <NuxtLink to="/login" class="font-medium text-primary hover:underline">
            {{ t("auth.signup.login") }}
          </NuxtLink>
        </p>
      </template>
    </div>
  </UContainer>
</template>
