<script setup lang="ts">
import AgencySwitcher from "~/components/officer/AgencySwitcher.vue";
import AnalyticsCards from "~/components/officer/AnalyticsCards.vue";
import AnalyticsBarList from "~/components/officer/AnalyticsBarList.vue";
import TrendBars from "~/components/officer/TrendBars.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import EmptyState from "~/components/ui/EmptyState.vue";

definePageMeta({ layout: "officer", middleware: "auth" });

const { t, te } = useI18n();
const route = useRoute();
const api = useApi();

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

const agencies = ref<Agency[]>([]);
const agencyId = ref<string | null>(null);
const analytics = ref<Analytics | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const agenciesLoaded = ref(false);

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

async function load() {
  if (!agencyId.value) {
    error.value = t("officer.agency.none");
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    analytics.value = await api.officer.analytics({ agencyId: agencyId.value });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
    analytics.value = null;
  } finally {
    loading.value = false;
  }
}

/**
 * As on the queue page, an unhandled rejection here left the page inert with no
 * explanation. Analytics additionally requires `officer.analytics.read`, which is
 * granted to the supervisor and admin agency roles but not to a plain officer, so
 * a legitimate FORBIDDEN must be shown rather than swallowed.
 */
async function bootstrap() {
  loading.value = true;
  error.value = null;
  try {
    agencies.value = await api.officer.myAgencies();
    agenciesLoaded.value = true;
  } catch (cause) {
    agencies.value = [];
    error.value = cause instanceof Error ? cause.message : String(cause);
    loading.value = false;
    return;
  }

  const fromQuery = typeof route.query.agencyId === "string" ? route.query.agencyId : null;
  agencyId.value =
    fromQuery && agencies.value.some((agency) => agency.id === fromQuery)
      ? fromQuery
      : (agencies.value[0]?.id ?? null);

  loading.value = false;
  await load();
}

async function retry() {
  if (!agenciesLoaded.value || agencies.value.length === 0) {
    await bootstrap();
    return;
  }
  await load();
}

onMounted(bootstrap);

watch(agencyId, () => {
  if (!agenciesLoaded.value) {
    return;
  }
  void load();
});
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <PageHeader
      :title="t('officer.analytics.title')"
      :subtitle="t('officer.analytics.subtitle')"
      icon="i-tabler-chart-bar"
      max-width="max-w-7xl"
    >
      <template #actions>
        <AgencySwitcher v-model="agencyId" :agencies="agencies" />
      </template>
    </PageHeader>

    <LoadingState
      v-if="loading"
      variant="skeleton-grid"
      :count="6"
      :label="t('officer.common.loading')"
    />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      :title="errorTitle"
      :description="error"
    >
      <template #actions>
        <UButton color="error" variant="soft" :label="t('officer.common.retry')" @click="retry()" />
      </template>
    </UAlert>

    <template v-else-if="analytics">
      <AnalyticsCards :totals="analytics.totals" :patterns="analytics.patterns" />

      <div class="grid gap-4 lg:grid-cols-2">
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
  </div>
</template>
