<script setup lang="ts">
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import RegistryFlagList from "~/components/officer/monitoring/RegistryFlagList.vue";

definePageMeta({ layout: "officer", middleware: "auth" });

// Sentinel for the "Toutes" option: Reka UI forbids empty-string item values.
const ALL = "all";
const filterValue = (v: string): string | undefined => (v === ALL ? undefined : v);

type Severity = "warning" | "error" | "info";

type RegistryFlag = {
  id: string;
  kind: string;
  severity: Severity;
  companyId: string;
  companyName: string;
  companyNameAr: string | null;
  uniqueIdentifier: string | null;
  title: string;
  detail: string;
  evidence: Array<{ label: string; value: string }>;
};

const KINDS = [
  "duplicate_identifier",
  "duplicate_name",
  "capital_mismatch",
  "legal_form_mismatch",
  "stale_active",
  "fiscal_default",
  "missing_financial_statements",
  "suspended_with_open_submission",
] as const;

const { t, te } = useI18n();
const { agencies, agencyId, ready, error: agencyError, ensureLoaded } = useOfficerAgency();

const client = useApi() as unknown as {
  officer: {
    registryFlags: (input: Record<string, unknown>) => Promise<{
      items: RegistryFlag[];
      counts: Record<string, number>;
      nextCursor: string | null;
    }>;
  };
};

const items = ref<RegistryFlag[]>([]);
const nextCursor = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const kind = ref(ALL);
const severity = ref(ALL);

function kindLabel(value: string): string {
  const key = `officerMonitoring.registry.kindLabels.${value}`;
  return te(key) ? t(key) : value;
}

const kindItems = computed(() => [
  { label: t("officerMonitoring.registry.kindAll"), value: ALL },
  ...KINDS.map((value) => ({ label: kindLabel(value), value })),
]);

const severityItems = computed(() => [
  { label: t("officerMonitoring.registry.severityAll"), value: ALL },
  { label: t("officerMonitoring.registry.severities.error"), value: "error" },
  { label: t("officerMonitoring.registry.severities.warning"), value: "warning" },
  { label: t("officerMonitoring.registry.severities.info"), value: "info" },
]);

async function load(append = false): Promise<void> {
  if (!agencyId.value) {
    error.value = t("officer.agency.none");
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await client.officer.registryFlags({
      agencyId: agencyId.value,
      kind: filterValue(kind.value),
      severity: filterValue(severity.value),
      limit: 25,
      cursor: append ? (nextCursor.value ?? undefined) : undefined,
    });
    items.value = append ? [...items.value, ...result.items] : result.items;
    nextCursor.value = result.nextCursor ?? null;
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

watch([agencyId, ready, kind, severity], () => {
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
      :title="t('officerMonitoring.registry.errorTitle')"
      :description="t('officerMonitoring.registry.error')"
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
          v-model="kind"
          :items="kindItems"
          size="md"
          icon="i-tabler-category"
          class="w-full sm:w-72"
        />

        <USelect
          v-model="severity"
          :items="severityItems"
          size="md"
          icon="i-tabler-alert-triangle"
          class="w-full sm:w-56"
        />
      </div>

      <UAlert
        v-if="error && items.length > 0"
        color="error"
        variant="subtle"
        :title="t('officerMonitoring.registry.errorTitle')"
        :description="t('officerMonitoring.registry.error')"
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
        variant="skeleton-list"
        :count="4"
        :label="t('officerMonitoring.common.loading')"
      />

      <EmptyState
        v-else-if="items.length === 0"
        icon="i-tabler-shield-check"
        :title="t('officerMonitoring.registry.empty')"
        :description="t('officerMonitoring.registry.emptyDescription')"
      />

      <RegistryFlagList v-else :items="items" :loading="loading" />

      <div v-if="nextCursor" class="flex justify-center">
        <UButton
          color="neutral"
          variant="soft"
          size="md"
          icon="i-tabler-chevron-down"
          :loading="loading"
          :label="t('officerMonitoring.registry.loadMore')"
          @click="load(true)"
        />
      </div>
    </template>
  </div>
</template>
