<script setup lang="ts">
import AgencySwitcher from "~/components/officer/AgencySwitcher.vue";
import AnalyticsCards from "~/components/officer/AnalyticsCards.vue";
import AnalyticsBarList from "~/components/officer/AnalyticsBarList.vue";
import TrendBars from "~/components/officer/TrendBars.vue";

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

function findingLabel(code: string): string {
  const key = `checks.findings.${code}.title`;
  return te(key) ? t(key) : code;
}

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

onMounted(async () => {
  agencies.value = await api.officer.myAgencies();
  const fromQuery = typeof route.query.agencyId === "string" ? route.query.agencyId : null;
  agencyId.value =
    fromQuery && agencies.value.some((agency) => agency.id === fromQuery)
      ? fromQuery
      : (agencies.value[0]?.id ?? null);
  await load();
});

watch(agencyId, () => {
  void load();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ t("officer.analytics.title") }}
        </h1>
        <p class="text-base text-muted">{{ t("officer.analytics.subtitle") }}</p>
      </div>
      <AgencySwitcher v-model="agencyId" :agencies="agencies" />
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-base text-muted">
      <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
      <span>{{ t("officer.common.loading") }}</span>
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      :title="t('officer.analytics.supervisorOnly')"
      :description="error"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="lg"
          :label="t('officer.common.retry')"
          @click="load()"
        />
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

    <UAlert
      v-else
      color="neutral"
      variant="soft"
      icon="i-tabler-info-circle"
      :description="t('officer.analytics.empty')"
    />
  </div>
</template>
