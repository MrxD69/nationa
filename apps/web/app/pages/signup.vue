<script setup lang="ts">
definePageMeta({ layout: "auth" });

type Choice = "has_company" | "no_company" | "accountant";
type AccountType = "owner" | "accountant";

const client = useSupabaseClient();
const { t } = useI18n();

const fullName = ref("");
const email = ref("");
const password = ref("");
const choice = ref<Choice | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const awaitingConfirmation = ref(false);

const licenseNumber = ref("");
const verifying = ref(false);
const verified = ref(false);
const verifiedAt = ref<string | null>(null);
let verifyTimer: ReturnType<typeof setTimeout> | undefined;
let confirmTimer: ReturnType<typeof setTimeout> | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fullNameValid = computed(() => fullName.value.trim().length >= 2);
const emailValid = computed(() => EMAIL_RE.test(email.value.trim()));
const passwordValid = computed(() => password.value.length >= 8);

const fullNameError = computed(() =>
  fullName.value.length > 0 && !fullNameValid.value
    ? t("auth.signup.errors.nameRequired")
    : undefined,
);
const emailError = computed(() =>
  email.value.length > 0 && !emailValid.value ? t("auth.signup.errors.invalidEmail") : undefined,
);
const passwordError = computed(() =>
  password.value.length > 0 && !passwordValid.value
    ? t("auth.signup.errors.passwordTooShort")
    : undefined,
);

function clearVerification() {
  clearTimeout(verifyTimer);
  clearTimeout(confirmTimer);
  verifying.value = false;
  verified.value = false;
  verifiedAt.value = null;
}

/**
 * Placeholder professional check. Real RNE access is subscription-only, so a
 * non-empty matricule fiscal deterministically verifies after a short delay.
 */
function startVerification(value: string) {
  clearVerification();
  if (choice.value !== "accountant" || value.trim().length === 0) {
    return;
  }
  verifyTimer = setTimeout(() => {
    verifying.value = true;
    confirmTimer = setTimeout(() => {
      verifying.value = false;
      verified.value = true;
      verifiedAt.value = new Date().toISOString();
    }, 700);
  }, 600);
}

watch(licenseNumber, (value) => startVerification(value));

watch(choice, (value) => {
  if (value === "accountant") {
    startVerification(licenseNumber.value);
  } else {
    clearVerification();
  }
});

onBeforeUnmount(clearVerification);

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
    icon: "i-tabler-user-shield",
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

  if (!fullNameValid.value) {
    error.value = t("auth.signup.errors.nameRequired");
    return;
  }

  loading.value = true;
  try {
    const { data, error: authError } = await client.auth.signUp({
      email: email.value.trim(),
      password: password.value,
      options: {
        data: {
          accountType: selected.accountType,
          choice: selected.value,
          displayName: fullName.value.trim(),
          ...(selected.value === "accountant"
            ? {
                professional: {
                  type: "accountant",
                  licenseNumber: licenseNumber.value.trim(),
                  verifiedAt: verifiedAt.value ?? new Date().toISOString(),
                },
              }
            : {}),
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
  <div class="w-full max-w-xl">
    <div v-if="awaitingConfirmation" class="flex flex-col items-center gap-4 py-4 text-center">
      <span
        class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <UIcon name="i-tabler-mail-check" class="size-7" />
      </span>
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
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

    <template v-else>
      <div class="space-y-6">
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
            {{ t("auth.signup.title") }}
          </h1>
          <p class="text-base text-muted">{{ t("auth.signup.subtitle") }}</p>
        </div>

        <form class="grid gap-6" @submit.prevent="submit">
          <div class="space-y-3">
            <p class="text-sm font-semibold tracking-wide text-highlighted">
              {{ t("auth.signup.roleTitle") }}
            </p>
            <div class="grid gap-3">
              <button
                v-for="role in roles"
                :key="role.value"
                type="button"
                class="group flex w-full items-start gap-4 rounded-xl border p-4 text-start transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-default focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:p-5"
                :class="
                  choice === role.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                    : 'border-default bg-default hover:border-accented hover:bg-accented/60'
                "
                :aria-pressed="choice === role.value"
                :disabled="loading"
                @click="choice = role.value"
              >
                <span
                  class="flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors"
                  :class="
                    choice === role.value
                      ? 'bg-primary text-inverted'
                      : 'bg-elevated text-toned group-hover:text-highlighted'
                  "
                >
                  <UIcon :name="role.icon" class="size-6" />
                </span>

                <span class="min-w-0 flex-1 space-y-1">
                  <span class="block text-base font-semibold text-highlighted">
                    {{ role.title }}
                  </span>
                  <span class="block text-sm leading-relaxed text-muted">
                    {{ role.description }}
                  </span>
                </span>

                <span
                  class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors"
                  :class="
                    choice === role.value
                      ? 'border-primary bg-primary text-inverted'
                      : 'border-accented bg-default'
                  "
                >
                  <UIcon v-if="choice === role.value" name="i-tabler-check" class="size-3.5" />
                </span>
              </button>
            </div>
          </div>

          <UFormField :label="t('auth.signup.fullName')" :error="fullNameError">
            <UInput
              v-model="fullName"
              type="text"
              autocomplete="name"
              icon="i-tabler-user"
              :placeholder="t('auth.signup.fullNamePlaceholder')"
              class="w-full"
              required
              minlength="2"
              :disabled="loading"
            />
          </UFormField>

          <UFormField :label="t('auth.signup.email')" :error="emailError">
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

          <UFormField
            :label="t('auth.signup.password')"
            :hint="t('auth.signup.passwordHint')"
            :error="passwordError"
          >
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

          <div v-if="choice === 'accountant'" class="space-y-3 border-t border-default pt-6">
            <div class="flex items-center gap-2">
              <span
                class="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary"
              >
                <UIcon name="i-tabler-shield-lock" class="size-5" />
              </span>
              <p class="text-base font-medium text-highlighted">
                {{ t("auth.signup.professional.title") }}
              </p>
            </div>

            <UFormField
              :label="t('auth.signup.professional.license')"
              :hint="t('auth.signup.professional.licenseHint')"
            >
              <UInput
                v-model="licenseNumber"
                type="text"
                icon="i-tabler-id-badge-2"
                :placeholder="t('auth.signup.professional.licensePlaceholder')"
                class="w-full"
                :disabled="loading"
              />
            </UFormField>

            <div v-if="verifying" class="flex items-center gap-2 text-sm text-muted">
              <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
              {{ t("auth.signup.professional.verifying") }}
            </div>
            <div
              v-else-if="verified"
              class="flex items-center gap-2 text-sm font-medium text-success"
            >
              <UIcon name="i-tabler-shield-check" class="size-4" />
              {{ t("auth.signup.professional.verified") }}
            </div>

            <p class="text-xs leading-relaxed text-muted">
              {{ t("auth.signup.professional.rneNote") }}
            </p>
          </div>

          <UAlert v-if="error" color="error" variant="subtle" :title="error" />

          <UButton
            type="submit"
            block
            :loading="loading"
            :disabled="
              loading ||
              !fullNameValid ||
              !emailValid ||
              !passwordValid ||
              choice === null ||
              (choice === 'accountant' && !verified)
            "
          >
            {{ t("auth.signup.submit") }}
          </UButton>
        </form>
      </div>

      <p class="mt-6 text-center text-base text-muted">
        {{ t("auth.signup.haveAccount") }}
        <NuxtLink to="/login" class="font-medium text-primary hover:underline">
          {{ t("auth.signup.login") }}
        </NuxtLink>
      </p>
    </template>
  </div>
</template>
