<script setup lang="ts">
import AgencyMark from "~/components/agency/AgencyMark.vue";
import ActionMeta from "~/components/action/ActionMeta.vue";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";
import ActionStepItem from "~/components/action/ActionStepItem.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import SectionHeader from "~/components/ui/SectionHeader.vue";
import { useOpenActions } from "~/composables/useOpenActions";

const props = defineProps<{
  templateId?: string;
  caseId?: string;
  companyId?: string;
}>();

const { locale, t } = useI18n();
const actions = useActions();
const actionPurpose = useActionPurpose();

const { data, isLoading, isError, error, refetch } = actions.trackerQuery({
  templateId: () => props.templateId,
  caseId: () => props.caseId,
  companyId: () => props.companyId,
});

const { track } = useOpenActions();

const start = actions.startMutation();

const tracker = computed(() => data.value ?? null);
const actionError = ref<string | null>(null);
const hasFees = computed(() => Boolean(tracker.value?.feeSummary?.items.length));

const name = computed(() => {
  if (!tracker.value) {
    return "";
  }
  return locale.value === "ar"
    ? (tracker.value.action.nameAr ?? tracker.value.action.nameFr)
    : tracker.value.action.nameFr;
});

const purpose = computed(() =>
  tracker.value ? actionPurpose(tracker.value.action.code, tracker.value.action.description) : "",
);

/*
 * The template's own description is only worth a second paragraph when it says
 * something the title and the plain-language sentence above it do not already
 * say — some templates simply repeat their own name in that column.
 */
const description = computed(() => {
  const text = tracker.value?.action.description?.trim();
  if (!text || text === purpose.value || text === name.value.trim()) {
    return null;
  }
  return text;
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

const progress = computed(() =>
  Math.min(100, Math.max(0, Math.round(tracker.value?.aggregate.progress ?? 0))),
);

const stepsDone = computed(() => {
  const aggregate = tracker.value?.aggregate;
  if (!aggregate) {
    return "";
  }
  return t(
    "actions.tracker.stepsDone",
    { completed: aggregate.completedSteps, total: aggregate.totalSteps },
    aggregate.completedSteps,
  );
});

/** Money is read as a figure, never as a bare number: always with its currency. */
function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(locale.value, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/*
 * Which steps are expanded lives here rather than inside each row, so "expand
 * all" is one state change and the next actionable step can be opened for you.
 */
const openSteps = ref(new Set<string>());
const allOpen = computed(() => {
  const steps = tracker.value?.steps.length ?? 0;
  return steps > 0 && openSteps.value.size >= steps;
});

function toggleStep(stepId: string): void {
  const next = new Set(openSteps.value);
  if (next.has(stepId)) {
    next.delete(stepId);
  } else {
    next.add(stepId);
  }
  openSteps.value = next;
}

function toggleAll(): void {
  openSteps.value = allOpen.value
    ? new Set<string>()
    : new Set((tracker.value?.steps ?? []).map((step) => step.id));
}

/*
 * Pin a démarche to the rail once it has actually been started. Browsing the
 * public catalogue should not clutter the sidebar; a filing in progress should
 * be one click away from anywhere in the app.
 */
watch(
  tracker,
  (current, previous) => {
    if (!current) {
      return;
    }

    if (current.action.id !== previous?.action.id) {
      const focus = current.aggregate.nextStepId ?? current.steps[0]?.id;
      openSteps.value = focus ? new Set([focus]) : new Set<string>();
    }

    if (!current.case) {
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
  <LoadingState
    v-if="isLoading"
    variant="skeleton-list"
    :count="5"
    :label="t('actions.tracker.loading')"
  />

  <UAlert
    v-else-if="isError"
    class="rounded-lg"
    color="error"
    variant="subtle"
    icon="i-tabler-alert-triangle"
    :title="t('actions.hub.error')"
    :description="error?.message"
  >
    <template #actions>
      <UButton color="error" variant="soft" :label="t('actions.hub.retry')" @click="refetch()" />
    </template>
  </UAlert>

  <div v-else-if="tracker" class="space-y-6">
    <PageHeader
      :title="name"
      back-to="/actions"
      :back-label="t('actions.tracker.back')"
      max-width="max-w-none"
    >
      <template #subtitle>
        <p v-if="purpose" class="text-base leading-7 text-muted">{{ purpose }}</p>
      </template>

      <template #topActions>
        <UButton
          v-if="tracker.case"
          :to="`/cases/${tracker.case.id}`"
          icon="i-tabler-arrow-right"
          :label="t('actions.tracker.openCase')"
          :ui="{ leadingIcon: 'rtl:rotate-180' }"
        />
        <UButton
          v-else
          icon="i-tabler-player-play"
          :loading="start.isPending.value"
          :disabled="start.isPending.value"
          :label="t('actions.tracker.startCase')"
          @click="onStart"
        />
      </template>

      <template #meta>
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span class="inline-flex items-center gap-2">
              <AgencyMark :agency-id="tracker.action.agencyId" size="xs" alt="" />
              <span class="text-sm font-medium text-toned">{{ agencyName }}</span>
            </span>
            <ActionStatusBadge :state="tracker.aggregate.state" size="sm" />
            <ActionMeta
              :steps="tracker.aggregate.totalSteps"
              :days="tracker.action.estimatedDays"
            />
          </div>

          <!-- Progress in words first, as a bar second: "4 of 9" answers the
               question a percentage only gestures at. -->
          <div class="space-y-1.5">
            <div class="flex items-baseline justify-between gap-3">
              <span class="text-sm font-medium text-toned">{{ stepsDone }}</span>
              <span class="tabular text-sm text-muted">{{ progress }}%</span>
            </div>
            <UProgress
              :model-value="progress"
              size="md"
              :aria-label="t('actions.tracker.progress')"
            />
          </div>

          <p v-if="description" class="max-w-3xl text-base leading-7 text-muted">
            {{ description }}
          </p>
        </div>
      </template>
    </PageHeader>

    <UAlert
      v-if="actionError"
      class="rounded-lg"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="actionError"
    />

    <div class="grid gap-8" :class="hasFees ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]' : ''">
      <section class="min-w-0 space-y-4">
        <SectionHeader
          :title="t('actions.tracker.stepsTitle')"
          :description="t('actions.tracker.stepsHint')"
          icon="i-tabler-list-check"
          :count="tracker.steps.length"
        >
          <template #actions>
            <UButton
              v-if="tracker.steps.length > 1"
              color="neutral"
              variant="ghost"
              size="sm"
              :icon="allOpen ? 'i-tabler-fold-up' : 'i-tabler-fold-down'"
              :label="allOpen ? t('actions.tracker.collapseAll') : t('actions.tracker.expandAll')"
              @click="toggleAll"
            />
          </template>
        </SectionHeader>

        <ol class="m-0 list-none p-0" v-reveal.stagger="{ selector: '[data-reveal-item]' }">
          <ActionStepItem
            v-for="(step, index) in tracker.steps"
            :key="step.id"
            :step="step"
            :index="index"
            :total="tracker.steps.length"
            :last="index === tracker.steps.length - 1"
            :open="openSteps.has(step.id)"
            :current="step.id === tracker.aggregate.nextStepId"
            :agency-id="tracker.action.agencyId"
            @toggle="toggleStep(step.id)"
          />
        </ol>
      </section>

      <aside class="space-y-4">
        <section
          v-if="tracker.feeSummary && tracker.feeSummary.items.length"
          class="space-y-3 rounded-lg border border-default p-5"
        >
          <h2 class="text-base font-semibold text-highlighted">{{ t("actions.tracker.fees") }}</h2>

          <dl class="m-0 divide-y divide-default">
            <div
              v-for="item in tracker.feeSummary.items"
              :key="item.feeId"
              class="flex items-baseline justify-between gap-3 py-2 first:pt-0"
            >
              <dt class="min-w-0 text-base text-muted">{{ item.label }}</dt>
              <dd class="tabular shrink-0 text-base font-medium text-toned" dir="ltr">
                {{ formatAmount(item.amount, item.currency) }}
              </dd>
            </div>
          </dl>

          <div
            class="flex items-baseline justify-between gap-3 border-t border-default pt-3 text-base"
          >
            <span class="font-medium text-highlighted">{{ t("cases.payment.total") }}</span>
            <span class="tabular font-semibold text-highlighted" dir="ltr">
              {{ formatAmount(tracker.feeSummary.total, tracker.feeSummary.currency) }}
            </span>
          </div>

          <p class="text-sm leading-6 text-dimmed">{{ t("actions.tracker.feesHint") }}</p>
        </section>
      </aside>
    </div>
  </div>

  <UAlert
    v-else
    class="rounded-lg"
    color="error"
    variant="subtle"
    icon="i-tabler-alert-triangle"
    :title="t('actions.tracker.notFound')"
    :description="t('actions.tracker.notFoundHint')"
  >
    <template #actions>
      <UButton color="error" variant="soft" to="/actions" :label="t('actions.tracker.back')" />
    </template>
  </UAlert>
</template>
