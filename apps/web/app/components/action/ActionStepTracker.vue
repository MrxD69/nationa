<script setup lang="ts">
import ActionProgressRing from "~/components/action/ActionProgressRing.vue";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";
import ActionNextCallout from "~/components/action/ActionNextCallout.vue";
import ActionStepItem from "~/components/action/ActionStepItem.vue";

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
  <div v-if="isLoading" class="flex items-center gap-2 py-12 text-sm text-muted">
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
        size="sm"
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
          <UBadge color="neutral" variant="subtle" size="sm">{{ agencyName }}</UBadge>
          <ActionStatusBadge :state="tracker.aggregate.state" />
          <span v-if="tracker.action.estimatedDays" class="text-xs text-muted">
            {{ t("actions.hub.days", { count: tracker.action.estimatedDays }) }}
          </span>
        </div>
        <h1 class="text-xl font-semibold text-highlighted">{{ name }}</h1>
        <p v-if="tracker.action.description" class="max-w-2xl text-sm leading-6 text-muted">
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
          />
        </ol>
      </section>

      <aside class="space-y-4 lg:border-s lg:border-default lg:ps-6">
        <UCard variant="subtle">
          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-highlighted">
              {{ t("actions.tracker.verification") }}
            </h2>
            <div class="space-y-1 text-sm text-muted">
              <p>
                {{
                  tracker.verification.hasRun
                    ? t("actions.tracker.verified")
                    : t("actions.tracker.noRun")
                }}
              </p>
              <p v-if="tracker.verification.ranAt" class="text-xs">
                {{ t("actions.tracker.lastRun") }}:
                {{ new Date(tracker.verification.ranAt).toLocaleString(locale) }}
              </p>
              <div class="flex flex-wrap gap-2 pt-1">
                <UBadge
                  v-if="tracker.verification.openErrors"
                  color="warning"
                  variant="subtle"
                  size="xs"
                >
                  {{ t("actions.severity.error") }}: {{ tracker.verification.openErrors }}
                </UBadge>
                <UBadge
                  v-if="tracker.verification.openBlockers"
                  color="error"
                  variant="subtle"
                  size="xs"
                >
                  {{ t("actions.severity.blocker") }}: {{ tracker.verification.openBlockers }}
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>

        <UCard v-if="tracker.feeSummary" variant="subtle">
          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-highlighted">
              {{ t("actions.tracker.fees") }}
            </h2>
            <ul class="grid gap-1.5">
              <li
                v-for="item in tracker.feeSummary.items"
                :key="item.feeId"
                class="flex items-center justify-between gap-2 text-sm"
              >
                <span class="min-w-0 truncate text-muted">{{ item.label }}</span>
                <span class="shrink-0 font-medium text-toned">
                  {{ item.amount.toFixed(2) }} {{ item.currency }}
                </span>
              </li>
            </ul>
            <div
              class="flex items-center justify-between gap-2 border-t border-default pt-2 text-sm"
            >
              <span class="font-medium text-highlighted">{{ t("cases.payment.total") }}</span>
              <span class="font-semibold text-highlighted">
                {{ tracker.feeSummary.total.toFixed(2) }} {{ tracker.feeSummary.currency }}
              </span>
            </div>
          </div>
        </UCard>
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
