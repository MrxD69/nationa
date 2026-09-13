<script setup lang="ts">
import AgencySwitcher from "~/components/officer/AgencySwitcher.vue";
import AnalyticsCards from "~/components/officer/AnalyticsCards.vue";
import AnalyticsBarList from "~/components/officer/AnalyticsBarList.vue";
import TrendBars from "~/components/officer/TrendBars.vue";
import OfficerStatStrip from "~/components/officer/ui/OfficerStatStrip.vue";
import OfficerPerformanceTable from "~/components/officer/monitoring/OfficerPerformanceTable.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import EmptyState from "~/components/ui/EmptyState.vue";

definePageMeta({ layout: "officer", middleware: "auth" });

const { t, te, locale } = useI18n();
const route = useRoute();
const api = useApi();
const opsApi = useApi() as unknown as {
  officer: {
    opsAnalytics: (input: {
      agencyId: string;
      from?: string;
      to?: string;
    }) => Promise<OpsAnalytics>;
  };
};

type Agency = { id: string; nameFr: string; nameAr?: string | null; role?: string };
type Analytics = {
  totals: {
    submissions: number;
    byTier: { clean: number; minor_concern: number; needs_review: number };
    estimatedTimeSavedMinutes: number;
    caughtByChecks: number;
  };
  patterns: {
    submissionCount: number;
    commonFindings: Array<{ code: string; count: number }>;
    commonRejectionReasons: Array<{ reason: string; count: number }>;
  };
  volume: Array<{ date: string; count: number }>;
  quality: Array<{ date: string; averageScore: number; cleanRatio: number }>;
};

type OpsAnalytics = {
  decisionTime: {
    avgHours: number;
    medianHours: number;
    buckets: Array<{ label: string; count: number }>;
  };
  perOfficer: Array<{ userId: string; name: string | null; decided: number; avgHours: number }>;
  sla: { breached: number; atRisk: number; onTime: number; breachRate: number };
  throughput: Array<{ date: string; submitted: number; decided: number }>;
  deficiency: {
    issued: number;
    resolved: number;
    awaitingResponse: number;
    overdueResponse: number;
  };
};

const agencies = ref<Agency[]>([]);
const agencyId = ref<string | null>(null);
const analytics = ref<Analytics | null>(null);
const error = ref<string | null>(null);
const agenciesLoaded = ref(false);
const bootLoading = ref(false);
const analyticsLoading = ref(false);

const ops = ref<OpsAnalytics | null>(null);
const opsError = ref<string | null>(null);
const opsForbidden = ref(false);
const opsLoading = ref(false);

const from = ref("");
const to = ref("");

function findingLabel(code: string): string {
  const key = `checks.findings.${code}.title`;
  return te(key) ? t(key) : t("officer.analytics.unknownFinding");
}

/**
 * A network failure and a permission failure are not the same story: only the
 * latter is about the supervisor role. Anything matching FORBIDDEN gets the
 * supervisor message; every other error keeps a neutral title.
 */
const errorTitle = computed(() =>
  /forbidden|403|supervisor/i.test(error.value ?? "")
    ? t("officer.analytics.supervisorOnly")
    : t("officer.analytics.errorTitle"),
);

const tierItems = computed(() => {
  const totals = analytics.value?.totals;
  if (!totals) {
    return [];
  }
  return [
    { label: t("officer.analytics.clean"), value: totals.byTier.clean },
    { label: t("officer.analytics.minor"), value: totals.byTier.minor_concern },
    { label: t("officer.analytics.needsReview"), value: totals.byTier.needs_review },
  ];
});

const findingItems = computed(() =>
  (analytics.value?.patterns.commonFindings ?? []).map((item) => ({
    label: findingLabel(item.code),
    value: item.count,
  })),
);

const reasonItems = computed(() =>
  (analytics.value?.patterns.commonRejectionReasons ?? []).map((item) => ({
    label: item.reason,
    value: item.count,
  })),
);

const volumeItems = computed(() =>
  (analytics.value?.volume ?? []).map((item) => ({ date: item.date, value: item.count })),
);

const qualityItems = computed(() =>
  (analytics.value?.quality ?? []).map((item) => ({ date: item.date, value: item.averageScore })),
);

const slaKpis = computed(() => {
  const sla = ops.value?.sla;
  if (!sla) {
    return [];
  }
  return [
    {
      key: "breached",
      icon: "i-tabler-alarm",
      label: t("officerMonitoring.analytics.sla.breached"),
      value: String(sla.breached),
      tone: "error" as const,
    },
    {
      key: "atRisk",
      icon: "i-tabler-clock-exclamation",
      label: t("officerMonitoring.analytics.sla.atRisk"),
      value: String(sla.atRisk),
      tone: "warning" as const,
    },
    {
      key: "breachRate",
      icon: "i-tabler-percentage",
      label: t("officerMonitoring.analytics.sla.breachRate"),
      value: formatPercent(sla.breachRate),
      tone: "neutral" as const,
    },
  ];
});

const decisionTimeKpis = computed(() => {
  const time = ops.value?.decisionTime;
  if (!time) {
    return [];
  }
  return [
    {
      key: "avg",
      icon: "i-tabler-clock-hour-4",
      label: t("officerMonitoring.analytics.decisionTime.avg"),
      value: formatHours(time.avgHours),
      tone: "neutral" as const,
    },
    {
      key: "median",
      icon: "i-tabler-clock-hour-8",
      label: t("officerMonitoring.analytics.decisionTime.median"),
      value: formatHours(time.medianHours),
      tone: "neutral" as const,
    },
  ];
});

const decisionBuckets = computed(() =>
  (ops.value?.decisionTime.buckets ?? []).map((bucket) => ({
    label: bucketLabel(bucket.label),
    value: bucket.count,
  })),
);

const deficiencyKpis = computed(() => {
  const deficiency = ops.value?.deficiency;
  if (!deficiency) {
    return [];
  }
  return [
    {
      key: "issued",
      icon: "i-tabler-mail-forward",
      label: t("officerMonitoring.analytics.deficiency.issued"),
      value: String(deficiency.issued),
      tone: "neutral" as const,
    },
    {
      key: "resolved",
      icon: "i-tabler-circle-check",
      label: t("officerMonitoring.analytics.deficiency.resolved"),
      value: String(deficiency.resolved),
      tone: "success" as const,
    },
    {
      key: "awaiting",
      icon: "i-tabler-hourglass",
      label: t("officerMonitoring.analytics.deficiency.awaiting"),
      value: String(deficiency.awaitingResponse),
      tone: "warning" as const,
    },
    {
      key: "overdue",
      icon: "i-tabler-alarm",
      label: t("officerMonitoring.analytics.deficiency.overdue"),
      value: String(deficiency.overdueResponse),
      tone: "error" as const,
    },
  ];
});

function bucketKey(value: string): string {
  if (value.includes("24")) {
    return "lt24";
  }
  if (value.includes("3-7")) {
    return "lt168";
  }
  if (value.includes("1-3")) {
    return "lt72";
  }
  return "gt168";
}

function bucketLabel(value: string): string {
  const key = `officerMonitoring.analytics.buckets.${bucketKey(value)}`;
  return te(key) ? t(key) : value;
}

function formatHours(value: number): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }
  const number = value.toLocaleString(locale.value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return value < 48 ? `${number} h` : `${number} j`;
}

/**
 * SLA/collaboration fields arrive as ratios between 0 and 1 (0.42 = 42 %).
 * Non-finite or missing values must never render "NaN %".
 */
function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }
  return `${Math.round(value * 100)} %`;
}

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function setRange(kind: "last7" | "last30" | "thisMonth" | "all"): void {
  if (kind === "all") {
    from.value = "";
    to.value = "";
    return;
  }
  const today = new Date();
  const end = isoDay(today);
  to.value = end;
  if (kind === "last7") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    from.value = isoDay(start);
    return;
  }
  if (kind === "last30") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    from.value = isoDay(start);
    return;
  }
  const start = new Date(today);
  start.setDate(1);
  from.value = isoDay(start);
}

const rangeArgs = computed(() => ({
  from: from.value || undefined,
  to: to.value || undefined,
}));

async function loadAnalytics(): Promise<void> {
  if (!agencyId.value) {
    error.value = t("officer.agency.none");
    return;
  }
  analyticsLoading.value = true;
  error.value = null;
  try {
    analytics.value = await api.officer.analytics({
      agencyId: agencyId.value,
      ...rangeArgs.value,
    });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
    analytics.value = null;
  } finally {
    analyticsLoading.value = false;
  }
}

async function loadOps(): Promise<void> {
  if (!agencyId.value) {
    return;
  }
  opsLoading.value = true;
  opsError.value = null;
  opsForbidden.value = false;
  try {
    ops.value = await opsApi.officer.opsAnalytics({
      agencyId: agencyId.value,
      ...rangeArgs.value,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    opsError.value = message;
    opsForbidden.value = /forbidden|403|permission/i.test(message);
    ops.value = null;
  } finally {
    opsLoading.value = false;
  }
}

function loadAll(): void {
  void loadAnalytics();
  void loadOps();
}

/**
 * As on the queue page, an unhandled rejection here left the page inert with no
 * explanation. Analytics additionally requires `officer.analytics.read`, which is
 * granted to the supervisor and admin agency roles but not to a plain officer, so
 * a legitimate FORBIDDEN must be shown rather than swallowed.
 */
async function bootstrap() {
  bootLoading.value = true;
  error.value = null;
  try {
    agencies.value = await api.officer.myAgencies();
    agenciesLoaded.value = true;
  } catch (cause) {
    agencies.value = [];
    error.value = cause instanceof Error ? cause.message : String(cause);
    bootLoading.value = false;
    return;
  }

  const fromQuery = typeof route.query.agencyId === "string" ? route.query.agencyId : null;
  agencyId.value =
    fromQuery && agencies.value.some((agency) => agency.id === fromQuery)
      ? fromQuery
      : (agencies.value[0]?.id ?? null);

  bootLoading.value = false;
  loadAll();
}

async function retry() {
  if (!agenciesLoaded.value || agencies.value.length === 0) {
    await bootstrap();
    return;
  }
  loadAll();
}

onMounted(bootstrap);

watch([agencyId, from, to], () => {
  if (!agenciesLoaded.value) {
    return;
  }
  loadAll();
});
</script>

<template>
  <div class="w-full space-y-6">
    <LoadingState
      v-if="bootLoading"
      variant="skeleton-grid"
      :count="6"
      :label="t('officerMonitoring.common.loading')"
    />

    <UAlert
      v-else-if="agencies.length === 0 && error"
      color="error"
      variant="subtle"
      :title="errorTitle"
      :description="error"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="md"
          :label="t('officerMonitoring.common.retry')"
          @click="retry()"
        />
      </template>
    </UAlert>

    <UAlert
      v-else-if="agencies.length === 0"
      color="neutral"
      variant="soft"
      icon="i-tabler-info-circle"
      :description="t('officer.agency.none')"
    />

    <template v-else>
      <!-- One compact toolbar: range, quick ranges and agency switcher, no labels or boxes. -->
      <div class="flex flex-wrap items-center gap-2 border-b border-default pb-3">
        <UInput
          v-model="from"
          type="date"
          size="md"
          icon="i-tabler-calendar"
          class="w-full sm:w-40"
          :aria-label="t('officerMonitoring.analytics.range.from')"
        />
        <span class="hidden text-sm text-muted sm:inline">→</span>
        <UInput
          v-model="to"
          type="date"
          size="md"
          icon="i-tabler-calendar"
          class="w-full sm:w-40"
          :aria-label="t('officerMonitoring.analytics.range.to')"
        />
        <UButton
          color="neutral"
          variant="soft"
          size="md"
          icon="i-tabler-calendar-week"
          :label="t('officerMonitoring.analytics.range.last7')"
          @click="setRange('last7')"
        />
        <UButton
          color="neutral"
          variant="soft"
          size="md"
          icon="i-tabler-calendar-month"
          :label="t('officerMonitoring.analytics.range.last30')"
          @click="setRange('last30')"
        />
        <UButton
          color="neutral"
          variant="soft"
          size="md"
          icon="i-tabler-calendar-stats"
          :label="t('officerMonitoring.analytics.range.thisMonth')"
          @click="setRange('thisMonth')"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="md"
          icon="i-tabler-calendar-off"
          :label="t('officerMonitoring.analytics.range.all')"
          @click="setRange('all')"
        />
        <AgencySwitcher v-model="agencyId" :agencies="agencies" class="ms-auto" />
      </div>

      <div v-if="analyticsLoading && !analytics">
        <LoadingState
          variant="skeleton-grid"
          :count="6"
          :label="t('officerMonitoring.common.loading')"
        />
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        :title="errorTitle"
        :description="error"
      >
        <template #actions>
          <UButton
            color="error"
            variant="soft"
            size="md"
            icon="i-tabler-refresh"
            :label="t('officerMonitoring.common.retry')"
            @click="loadAnalytics()"
          />
        </template>
      </UAlert>

      <template v-else-if="analytics">
        <AnalyticsCards
          :title="t('officer.analytics.title')"
          :totals="analytics.totals"
          :patterns="analytics.patterns"
        />

        <div class="grid gap-x-8 gap-y-6 lg:grid-cols-2">
          <AnalyticsBarList
            :title="t('officer.analytics.byTier')"
            :items="tierItems"
            :empty-label="t('officer.analytics.noData')"
          />
          <AnalyticsBarList
            :title="t('officer.analytics.kpi.commonFindings')"
            :items="findingItems"
            :empty-label="t('officer.analytics.noData')"
          />
          <AnalyticsBarList
            :title="t('officer.analytics.kpi.commonReasons')"
            :items="reasonItems"
            :empty-label="t('officer.analytics.noData')"
          />
          <TrendBars
            :title="t('officer.analytics.volume')"
            :items="volumeItems"
            :empty-label="t('officer.analytics.noData')"
          />
          <TrendBars
            :title="t('officer.analytics.quality')"
            :items="qualityItems"
            :empty-label="t('officer.analytics.noData')"
          />
        </div>
      </template>

      <EmptyState
        v-else
        icon="i-tabler-chart-bar"
        :title="t('officer.analytics.empty')"
        :description="t('officer.analytics.error')"
      />

      <div v-if="opsLoading && !ops">
        <LoadingState
          variant="skeleton-grid"
          :count="4"
          :label="t('officerMonitoring.common.loading')"
        />
      </div>

      <template v-else-if="ops">
        <section class="border-t border-default pt-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">
            {{ t("officerMonitoring.analytics.sections.sla") }}
          </h2>
          <div class="pt-3">
            <OfficerStatStrip :items="slaKpis" />
          </div>
        </section>

        <section class="border-t border-default pt-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">
            {{ t("officerMonitoring.analytics.sections.decisionTime") }}
          </h2>
          <div class="space-y-4 pt-3">
            <OfficerStatStrip :items="decisionTimeKpis" />

            <AnalyticsBarList
              :title="t('officerMonitoring.analytics.decisionTime.buckets')"
              :items="decisionBuckets"
              :empty-label="t('officer.analytics.noData')"
            />
          </div>
        </section>

        <section v-if="!opsForbidden" class="border-t border-default pt-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">
            {{ t("officerMonitoring.analytics.sections.team") }}
          </h2>
          <div class="pt-3">
            <OfficerPerformanceTable :rows="ops.perOfficer" />
          </div>
        </section>

        <section class="border-t border-default pt-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">
            {{ t("officerMonitoring.analytics.sections.deficiency") }}
          </h2>
          <div class="pt-3">
            <OfficerStatStrip :items="deficiencyKpis" />
          </div>
        </section>
      </template>

      <UAlert
        v-else-if="opsForbidden"
        color="warning"
        variant="subtle"
        icon="i-tabler-lock"
        :description="t('officerMonitoring.analytics.forbidden')"
      />

      <UAlert
        v-else-if="opsError"
        color="warning"
        variant="subtle"
        icon="i-tabler-alert-triangle"
        :title="t('officerMonitoring.analytics.partialError')"
        :description="opsError"
      >
        <template #actions>
          <UButton
            color="warning"
            variant="soft"
            size="md"
            icon="i-tabler-refresh"
            :label="t('officerMonitoring.common.retry')"
            @click="loadOps()"
          />
        </template>
      </UAlert>
    </template>
  </div>
</template>
