<script setup lang="ts">
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import ConditionsTable from "~/components/officer/monitoring/ConditionsTable.vue";

definePageMeta({ layout: "officer", middleware: "auth" });

// Sentinel for the "Toutes" option: Reka UI forbids empty-string item values.
const ALL = "all";
const filterValue = (v: string): string | undefined => (v === ALL ? undefined : v);

type Bucket = "overdue" | "due_soon" | "upcoming" | "unknown";

type ConditionItem = {
  companyId: string;
  companyName: string;
  companyNameAr: string | null;
  uniqueIdentifier: string | null;
  companyLegalForm: string | null;
  obligationId: string;
  obligationCode: string;
  obligationNameFr: string;
  obligationNameAr: string | null;
  periodicity: string;
  dueDate: string | null;
  daysRemaining: number | null;
  bucket: Bucket;
  penaltySummary: string | null;
  legalBasis: string | null;
  registryState: string | null;
  fiscalDefault: boolean | string | null;
  lastFinancialStatementsDate: string | null;
  companyRegistryType: string | null;
};

type CompanyIndexEntry = {
  id: string;
  name: string;
  nameAr: string | null;
};

const { t, locale } = useI18n();
const { agencies, agencyId, ready, error: agencyError, ensureLoaded } = useOfficerAgency();

const client = useApi() as unknown as {
  officer: {
    conditions: (input: Record<string, unknown>) => Promise<{
      items: ConditionItem[];
      nextCursor: string | null;
      counts: {
        overdue: number;
        dueSoon: number;
        upcoming: number;
        unknown: number;
        companies: number;
      };
      truncated?: boolean;
    }>;
  };
};

const items = ref<ConditionItem[]>([]);
const nextCursor = ref<string | null>(null);
const truncated = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const bucket = ref<string>(ALL);
const companyId = ref<string | undefined>(undefined);
const knownCompanies = ref<CompanyIndexEntry[]>([]);

const bucketItems = computed(() => [
  { label: t("officerMonitoring.conditions.bucketAll"), value: ALL },
  { label: t("officerMonitoring.conditions.buckets.overdue"), value: "overdue" },
  { label: t("officerMonitoring.conditions.buckets.due_soon"), value: "due_soon" },
  { label: t("officerMonitoring.conditions.buckets.upcoming"), value: "upcoming" },
  { label: t("officerMonitoring.conditions.buckets.unknown"), value: "unknown" },
]);

const companyOptions = computed(() =>
  knownCompanies.value.map((company) => ({
    label: locale.value === "ar" ? company.nameAr || company.name : company.name || company.nameAr,
    value: company.id,
  })),
);

function mergeCompanies(rows: ConditionItem[]): void {
  if (rows.length === 0) {
    return;
  }
  const index = new Map(knownCompanies.value.map((company) => [company.id, company]));
  for (const row of rows) {
    if (!index.has(row.companyId)) {
      index.set(row.companyId, {
        id: row.companyId,
        name: row.companyName,
        nameAr: row.companyNameAr,
      });
    }
  }
  knownCompanies.value = [...index.values()];
}

async function load(append = false): Promise<void> {
  if (!agencyId.value) {
    error.value = t("officer.agency.none");
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await client.officer.conditions({
      agencyId: agencyId.value,
      companyId: companyId.value || undefined,
      bucket: filterValue(bucket.value),
      limit: 25,
      cursor: append ? (nextCursor.value ?? undefined) : undefined,
    });
    items.value = append ? [...items.value, ...result.items] : result.items;
    nextCursor.value = result.nextCursor ?? null;
    truncated.value = Boolean(result.truncated);
    mergeCompanies(result.items);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
    if (!append) {
      items.value = [];
    }
  } finally {
    loading.value = false;
  }
}

async function retry(): Promise<void> {
  if (agencies.value.length === 0) {
    await ensureLoaded();
  }
  await load();
}

onMounted(async () => {
  await ensureLoaded();
  if (ready.value && agencyId.value && items.value.length === 0 && !loading.value) {
    void load();
  }
});

watch([agencyId, ready, bucket, companyId], () => {
  if (!ready.value || !agencyId.value) {
    return;
  }
  void load();
});
</script>

<template>
  <div class="w-full space-y-6">
    <UAlert
      v-if="agencyError && agencies.length === 0"
      color="error"
      variant="subtle"
      :title="t('officerMonitoring.conditions.errorTitle')"
      :description="t('officerMonitoring.conditions.error')"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="md"
          icon="i-tabler-refresh"
          :label="t('officerMonitoring.common.retry')"
          @click="retry()"
        />
      </template>
    </UAlert>

    <UAlert
      v-else-if="ready && !agencyId"
      color="neutral"
      variant="soft"
      icon="i-tabler-info-circle"
      :description="t('officer.agency.none')"
    />

    <template v-else>
      <div class="flex flex-wrap items-center gap-3 border-b border-default pb-3">
        <USelect
          v-model="bucket"
          :items="bucketItems"
          size="md"
          icon="i-tabler-filter"
          class="w-full sm:w-56"
        />

        <USelectMenu
          v-model="companyId"
          :items="companyOptions"
          value-key="value"
          label-key="label"
          :placeholder="t('officerMonitoring.conditions.companyPlaceholder')"
          :search-input="{ placeholder: t('officerMonitoring.common.search') }"
          size="md"
          icon="i-tabler-building-bank"
          class="w-full sm:w-72"
        />
      </div>

      <UAlert
        v-if="truncated"
        color="info"
        variant="subtle"
        icon="i-tabler-info-circle"
        :description="t('officerMonitoring.conditions.truncated')"
      />

      <UAlert
        v-if="error && items.length > 0"
        color="error"
        variant="subtle"
        :title="t('officerMonitoring.conditions.errorTitle')"
        :description="t('officerMonitoring.conditions.error')"
      >
        <template #actions>
          <UButton
            color="error"
            variant="soft"
            size="md"
            icon="i-tabler-refresh"
            :label="t('officerMonitoring.common.retry')"
            @click="retry()"
          />
        </template>
      </UAlert>

      <LoadingState
        v-if="loading && items.length === 0"
        variant="skeleton-rows"
        :count="6"
        :label="t('officerMonitoring.common.loading')"
      />

      <EmptyState
        v-else-if="items.length === 0"
        icon="i-tabler-calendar-check"
        :title="t('officerMonitoring.conditions.empty')"
        :description="t('officerMonitoring.conditions.emptyDescription')"
      />

      <ConditionsTable v-else :items="items" :loading="loading" />

      <div v-if="nextCursor" class="flex justify-center">
        <UButton
          color="neutral"
          variant="soft"
          size="md"
          icon="i-tabler-chevron-down"
          :loading="loading"
          :label="t('officerMonitoring.conditions.loadMore')"
          @click="load(true)"
        />
      </div>
    </template>
  </div>
</template>
