<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query";
import LoadingState from "~/components/ui/LoadingState.vue";

definePageMeta({ layout: "auth", middleware: "auth" });

type Choice = "has_company" | "no_company" | "accountant";
type Step = "choice" | "consent" | "finish";

const POLICY_VERSION = "1.0";

const orpc = useApiUtils();
const router = useRouter();
const { t } = useI18n();

const profileQuery = useQuery(orpc.onboarding.get.queryOptions());
const saveAnswers = useMutation(orpc.onboarding.saveAnswers.mutationOptions());
const acceptConsent = useMutation(orpc.onboarding.acceptConsent.mutationOptions());
const complete = useMutation(orpc.onboarding.complete.mutationOptions());

const step = ref<Step>("choice");
const choice = ref<Choice | null>(null);
const agreed = ref(false);
const error = ref<string | null>(null);
const initialized = ref(false);

watch(
  profileQuery.data,
  (data) => {
    if (!data || initialized.value) {
      return;
    }
    initialized.value = true;

    const answers = (data.answers ?? {}) as Record<string, unknown>;
    const savedChoice = typeof answers.choice === "string" ? (answers.choice as Choice) : null;
    choice.value = savedChoice;

    if (data.status === "completed") {
      step.value = "finish";
    } else if (savedChoice && answers.consent) {
      step.value = "consent";
    } else {
      step.value = "choice";
    }
  },
  { immediate: true },
);

const choices = computed(() => [
  {
    value: "has_company" as Choice,
    icon: "i-tabler-building-skyscraper",
    title: t("onboarding.choices.has_company.title"),
    description: t("onboarding.choices.has_company.description"),
  },
  {
    value: "no_company" as Choice,
    icon: "i-tabler-square-plus",
    title: t("onboarding.choices.no_company.title"),
    description: t("onboarding.choices.no_company.description"),
  },
  {
    value: "accountant" as Choice,
    icon: "i-tabler-briefcase",
    title: t("onboarding.choices.accountant.title"),
    description: t("onboarding.choices.accountant.description"),
  },
]);

const steps = computed(() => [
  { id: "choice", label: t("onboarding.steps.question") },
  { id: "consent", label: t("onboarding.steps.consent") },
  { id: "finish", label: t("onboarding.steps.finish") },
]);

const activeStepIndex = computed(() => steps.value.findIndex((item) => item.id === step.value));

const casesNewAvailable = computed(() =>
  router.getRoutes().some((route) => route.path === "/cases/new"),
);

const finishLabel = computed(() => {
  if (choice.value === "has_company") {
    return t("onboarding.finish.hasCompanyCta");
  }
  if (choice.value === "accountant") {
    return t("onboarding.finish.accountantCta");
  }
  return t("onboarding.finish.createCompanyCta");
});

function targetForChoice(): string {
  if (choice.value === "has_company") {
    return "/companies";
  }
  if (choice.value === "accountant") {
    return "/companies?view=accounting";
  }
  return casesNewAvailable.value ? "/cases/new?type=company_creation" : "/companies/new";
}

async function selectChoice(value: Choice) {
  error.value = null;
  choice.value = value;
  try {
    await saveAnswers.mutateAsync({ choice: value });
    step.value = "consent";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t("onboarding.errors.saveFailed");
  }
}

async function submitConsent() {
  error.value = null;
  if (!agreed.value) {
    error.value = t("onboarding.errors.consentRequired");
    return;
  }
  try {
    await acceptConsent.mutateAsync({ policyVersion: POLICY_VERSION, agreed: true });
    await complete.mutateAsync();
    step.value = "finish";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t("onboarding.errors.saveFailed");
  }
}

function continueToApp() {
  return navigateTo(targetForChoice());
}
</script>

<template>
  <div class="w-full max-w-3xl py-2">
    <div class="mb-8 space-y-2 text-center">
      <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
        {{ t("onboarding.title") }}
      </h1>
      <p class="text-base text-muted">{{ t("onboarding.subtitle") }}</p>
    </div>

    <div class="mb-8 flex flex-wrap items-center justify-center gap-2">
      <template v-for="(item, index) in steps" :key="item.id">
        <div class="flex items-center gap-2">
          <span
            class="flex size-6 items-center justify-center rounded-full text-sm font-medium transition-control"
            :class="
              index < activeStepIndex
                ? 'bg-success/10 text-success'
                : index === activeStepIndex
                  ? 'bg-primary text-inverted'
                  : 'bg-elevated text-muted'
            "
            :aria-current="index === activeStepIndex ? 'step' : undefined"
          >
            <UIcon v-if="index < activeStepIndex" name="i-tabler-check" class="size-4" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span
            class="text-sm transition-control"
            :class="
              index < activeStepIndex
                ? 'text-success'
                : index === activeStepIndex
                  ? 'text-highlighted'
                  : 'text-muted'
            "
          >
            {{ item.label }}
          </span>
        </div>
        <span
          v-if="index < steps.length - 1"
          class="h-px w-6 transition-control"
          :class="index < activeStepIndex ? 'bg-success/30' : 'bg-border'"
          aria-hidden="true"
        />
      </template>
    </div>

    <LoadingState v-if="profileQuery.isPending.value" :label="t('onboarding.loading')" />

    <UAlert
      v-else-if="profileQuery.isError.value"
      color="error"
      variant="subtle"
      :title="t('onboarding.errors.loadFailed')"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          icon="i-tabler-refresh"
          :label="t('onboarding.retryLoad')"
          :loading="profileQuery.isFetching.value"
          @click="profileQuery.refetch()"
        />
      </template>
    </UAlert>

    <div v-else class="grid gap-6">
      <UAlert v-if="error" color="error" variant="subtle" :title="error" />

      <template v-if="step === 'choice'">
        <h2 class="text-lg font-semibold text-highlighted">{{ t("onboarding.question") }}</h2>
        <div class="grid gap-3">
          <UButton
            v-for="option in choices"
            :key="option.value"
            color="neutral"
            variant="outline"
            class="h-auto w-full justify-start p-5 text-start"
            :loading="saveAnswers.isPending.value && choice === option.value"
            :disabled="saveAnswers.isPending.value"
            @click="selectChoice(option.value)"
          >
            <div class="flex items-start gap-4">
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-md bg-elevated"
              >
                <UIcon :name="option.icon" class="size-6" />
              </span>
              <span class="space-y-1">
                <span class="block text-base font-medium text-highlighted">
                  {{ option.title }}
                </span>
                <span class="block text-base text-muted">{{ option.description }}</span>
              </span>
            </div>
          </UButton>
        </div>
      </template>

      <template v-else-if="step === 'consent'">
        <section class="space-y-5">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ t("onboarding.consent.title") }}
          </h2>

          <div class="grid gap-5">
            <p class="text-base text-muted">{{ t("onboarding.consent.intro") }}</p>

            <dl class="grid gap-4">
              <div class="space-y-1">
                <dt class="text-base font-medium text-highlighted">
                  {{ t("onboarding.consent.dataTitle") }}
                </dt>
                <dd class="text-base text-muted">{{ t("onboarding.consent.data") }}</dd>
              </div>
              <div class="space-y-1">
                <dt class="text-base font-medium text-highlighted">
                  {{ t("onboarding.consent.whyTitle") }}
                </dt>
                <dd class="text-base text-muted">{{ t("onboarding.consent.why") }}</dd>
              </div>
              <div class="space-y-1">
                <dt class="text-base font-medium text-highlighted">
                  {{ t("onboarding.consent.retentionTitle") }}
                </dt>
                <dd class="text-base text-muted">{{ t("onboarding.consent.retention") }}</dd>
              </div>
            </dl>

            <USeparator />

            <UCheckbox v-model="agreed" :label="t('onboarding.consent.agree')" />

            <div class="flex items-center justify-between gap-3">
              <UButton
                color="neutral"
                variant="ghost"
                :label="t('onboarding.back')"
                :disabled="acceptConsent.isPending.value"
                @click="step = 'choice'"
              />
              <UButton
                :loading="acceptConsent.isPending.value || complete.isPending.value"
                :label="t('onboarding.consent.submit')"
                @click="submitConsent"
              />
            </div>
          </div>
        </section>
      </template>

      <template v-else>
        <div class="flex flex-col items-center gap-4 py-6 text-center">
          <span
            class="flex size-14 items-center justify-center rounded-full bg-success/10 text-success"
          >
            <UIcon name="i-tabler-check" class="size-8" />
          </span>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              {{ t("onboarding.finish.title") }}
            </h2>
            <p class="text-base text-muted">{{ t("onboarding.finish.description") }}</p>
          </div>
          <UButton :label="finishLabel" @click="continueToApp" />
        </div>
      </template>
    </div>
  </div>
</template>
