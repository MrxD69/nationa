<script setup lang="ts">
import AgencyMark from "~/components/agency/AgencyMark.vue";
import ActionProgressRing from "~/components/action/ActionProgressRing.vue";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";
import ActionNextCallout from "~/components/action/ActionNextCallout.vue";
import ActionStepItem from "~/components/action/ActionStepItem.vue";
import { useOpenActions } from "~/composables/useOpenActions";

const props = defineProps<{
  templateId?: string;
  caseId?: string;
  companyId?: string;
}>();

const { locale, t } = useI18n();
const actions = useActions();

const { data, isLoading, isError, error, refetch } = actions.trackerQuery({
  templateId: props.templateId,
  caseId: props.caseId,
  companyId: props.companyId,
});

const { track } = useOpenActions();

const start = actions.startMutation();
const runChecks = actions.runChecksMutation(props.caseId ?? "");

const tracker = computed(() => data.value ?? null);
const running = ref(false);
const actionError = ref<string | null>(null);

const name = computed(() => {
  if (!tracker.value) {
    return "";
  }
  return locale.value === "ar"
    ? (tracker.value.action.nameAr ?? tracker.value.action.nameFr)
    : tracker.value.action.nameFr;
});

const agencyName = computed(() => {
  if (!tracker.value) {
    return "";
  }
  return locale.value === "ar"
    ? (tracker.value.action.agencyNameAr ??
        tracker.value.action.agencyNameFr ??
        tracker.value.action.agencyId)
    : (tracker.value.action.agencyNameFr ?? tracker.value.action.agencyId);
});

const nextStep = computed(() => {
  const current = tracker.value;
  if (!current || !current.aggregate.nextStepId) {
    return null;
  }
  return current.steps.find((step) => step.id === current.aggregate.nextStepId) ?? null;
});

const activeCaseId = computed(() => tracker.value?.case?.id ?? props.caseId ?? null);

/*
 * Pin a démarche to the rail once it has actually been started. Browsing the
 * public catalogue should not clutter the sidebar; a filing in progress should
 * be one click away from anywhere in the app.
 */
watch(
  tracker,
  (current) => {
    if (!current || !current.case) {
      return;
    }
    track({
      templateId: current.action.id,
      caseId: current.case.id,
      companyId: current.case.companyId ?? props.companyId ?? null,
      nameFr: current.action.nameFr,
      nameAr: current.action.nameAr ?? null,
      agencyId: current.action.agencyId ?? null,
      progress: current.aggregate.progress,
    });
  },
  { immediate: true },
);

function nextOpenIndex(): number {
  const current = tracker.value;
  if (!current) {
    return -1;
  }
  return current.steps.findIndex(
    (step) =>
      step.reachable &&
      step.state !== "done" &&
      step.state !== "verified" &&
      step.state !== "generated",
  );
}

async function onRunChecks(): Promise<void> {
  if (!activeCaseId.value) {
    return;
  }
  running.value = true;
  actionError.value = null;
  try {
    await runChecks.mutateAsync({ caseId: activeCaseId.value });
    await refetch();
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    running.value = false;
  }
}

async function onStart(): Promise<void> {
  if (!tracker.value) {
    return;
  }
  actionError.value = null;
  try {
    const result = await start.mutateAsync({
      templateId: tracker.value.action.id,
      companyId: props.companyId,
    });
    await navigateTo(`/cases/${result.caseId}`);
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : String(cause);
  }
}
</script>

<template>
  <div v-if="isLoading" class="flex items-center gap-2 py-12 text-base text-muted">
    <UIcon name="i-tabler-loader-2" class="animate-spin" />
    <span>{{ t("actions.tracker.loading") }}</span>
  </div>

  <UAlert
    v-else-if="isError"
    color="error"
    variant="subtle"
    :title="t('actions.hub.error')"
    :description="error?.message"
  >
    <template #actions>
      <UButton
        color="error"
        variant="soft"
        size="lg"
        :label="t('actions.hub.retry')"
        @click="refetch()"
      />
    </template>
  </UAlert>

  <div v-else-if="tracker" class="grid gap-6">
    <div
      class="flex flex-wrap items-start justify-between gap-4"
      v-reveal="{ y: 12, duration: 0.45 }"
    >
      <div class="min-w-0 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <AgencyMark :agency-id="tracker.action.agencyId" size="sm" :alt="agencyName" />
          <span class="text-base font-semibold text-toned">{{ agencyName }}</span>
          <ActionStatusBadge :state="tracker.aggregate.state" />
          <span v-if="tracker.action.estimatedDays" class="text-sm text-muted">
            {{ t("actions.hub.days", { count: tracker.action.estimatedDays }) }}
          </span>
        </div>
        <h1 class="text-xl font-semibold text-highlighted">{{ name }}</h1>
        <p v-if="tracker.action.description" class="max-w-2xl text-base leading-6 text-muted">
          {{ tracker.action.description }}
        </p>
      </div>

      <div class="flex items-center gap-4">
        <ActionProgressRing
          :value="tracker.aggregate.progress"
          :label="t('actions.tracker.progress')"
        />
        <UButton
          v-if="!tracker.case"
          icon="i-tabler-player-play"
          :loading="start.isPending.value"
          :label="t('actions.tracker.startCase')"
          @click="onStart"
        />
      </div>
    </div>

    <UAlert v-if="actionError" color="error" variant="subtle" :title="actionError" />

    <ActionNextCallout
      :step="nextStep"
      :case-id="activeCaseId"
      :running="running"
      @run-checks="onRunChecks"
    />

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
      <section class="min-w-0">
        <ol class="m-0 list-none p-0" v-reveal.stagger="{ selector: '[data-reveal-item]' }">
          <ActionStepItem
            v-for="(step, index) in tracker.steps"
            :key="step.id"
            :step="step"
            :index="index"
            :total="tracker.steps.length"
            :last="index === tracker.steps.length - 1"
            :default-open="index === nextOpenIndex()"
            :agency-id="tracker.action.agencyId"
          />
        </ol>
      </section>

      <aside class="divide-y divide-default lg:border-s lg:border-default lg:ps-6">
        <section class="space-y-3 py-4 first:pt-0">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ t("actions.tracker.verification") }}
          </h2>
          <p class="text-base text-muted">
            {{
              tracker.verification.hasRun
                ? t("actions.tracker.verified")
                : t("actions.tracker.noRun")
            }}
          </p>
          <p v-if="tracker.verification.ranAt" class="text-base text-muted">
            {{ t("actions.tracker.lastRun") }}:
            {{ new Date(tracker.verification.ranAt).toLocaleString(locale) }}
          </p>
          <div
            v-if="tracker.verification.openErrors || tracker.verification.openBlockers"
            class="flex flex-wrap gap-2"
          >
            <UBadge
              v-if="tracker.verification.openErrors"
              color="warning"
              variant="subtle"
              size="lg"
            >
              {{ t("actions.severity.error") }}: {{ tracker.verification.openErrors }}
            </UBadge>
            <UBadge
              v-if="tracker.verification.openBlockers"
              color="error"
              variant="subtle"
              size="lg"
            >
              {{ t("actions.severity.blocker") }}: {{ tracker.verification.openBlockers }}
            </UBadge>
          </div>
        </section>

        <section v-if="tracker.feeSummary" class="space-y-3 py-4">
          <h2 class="text-lg font-semibold text-highlighted">{{ t("actions.tracker.fees") }}</h2>
          <ul class="grid gap-2">
            <li
              v-for="item in tracker.feeSummary.items"
              :key="item.feeId"
              class="flex items-center justify-between gap-2 text-base"
            >
              <span class="min-w-0 truncate text-muted">{{ item.label }}</span>
              <span class="shrink-0 font-medium text-toned">
                {{ item.amount.toFixed(2) }} {{ item.currency }}
              </span>
            </li>
          </ul>
          <div
            class="flex items-center justify-between gap-2 border-t border-default pt-3 text-base"
          >
            <span class="font-medium text-highlighted">{{ t("cases.payment.total") }}</span>
            <span class="font-semibold text-highlighted">
              {{ tracker.feeSummary.total.toFixed(2) }} {{ tracker.feeSummary.currency }}
            </span>
          </div>
        </section>
      </aside>
    </div>
  </div>

  <UAlert
    v-else
    color="error"
    variant="subtle"
    icon="i-tabler-alert-triangle"
    :title="t('actions.tracker.notFound')"
  />
</template>
