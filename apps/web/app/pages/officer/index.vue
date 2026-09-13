<script setup lang="ts">
import QueueTable from "~/components/officer/QueueTable.vue";
import AgencySwitcher from "~/components/officer/AgencySwitcher.vue";
import PageHeader from "~/components/ui/PageHeader.vue";

definePageMeta({ layout: "officer", middleware: "auth" });

const { t } = useI18n();
const route = useRoute();
const api = useApi();

type Agency = { id: string; nameFr: string; nameAr?: string | null; role?: string };
type QueueItem = {
  id: string;
  status: string;
  cleanlinessTier: string;
  cleanlinessScore?: string | number | null;
  submittedAt?: string | Date | null;
  ageDays: number | null;
  findingsCount: number;
  blockers: number;
  company?: {
    legalName?: string | null;
    legalNameAr?: string | null;
    tradeName?: string | null;
  } | null;
};

const agencies = ref<Agency[]>([]);
const agencyId = ref<string | null>(null);
const status = ref<string>("");
const tier = ref<string>("");
const sort = ref<"cleanliness" | "submittedAt">("cleanliness");
const items = ref<QueueItem[]>([]);
const nextCursor = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const agenciesLoaded = ref(false);

const statusItems = computed(() => [
  { label: t("officer.queue.allStatuses"), value: "" },
  { label: t("submissions.status.queued"), value: "queued" },
  { label: t("submissions.status.in_review"), value: "in_review" },
  { label: t("submissions.status.escalated"), value: "escalated" },
  { label: t("submissions.status.returned"), value: "returned" },
  { label: t("submissions.status.approved"), value: "approved" },
  { label: t("submissions.status.rejected"), value: "rejected" },
]);

const tierItems = computed(() => [
  { label: t("officer.queue.allTiers"), value: "" },
  { label: t("submissions.cleanliness.clean"), value: "clean" },
  { label: t("submissions.cleanliness.minor_concern"), value: "minor_concern" },
  { label: t("submissions.cleanliness.needs_review"), value: "needs_review" },
]);

async function load(append = false) {
  if (!agencyId.value) {
    /*
     * Returning silently here is what makes the retry button look broken: the
     * click fires, nothing loads, and nothing is said. Say it instead.
     */
    error.value = agenciesLoaded.value ? t("officer.agency.none") : t("officer.queue.error");
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await api.officer.queue({
      agencyId: agencyId.value,
      status: status.value
        ? (status.value as
            | "draft"
            | "queued"
            | "in_review"
            | "approved"
            | "rejected"
            | "returned"
            | "escalated")
        : undefined,
      tier: tier.value ? (tier.value as "clean" | "minor_concern" | "needs_review") : undefined,
      sort: sort.value,
      limit: 25,
      cursor: append ? (nextCursor.value ?? undefined) : undefined,
    });
    items.value = append ? [...items.value, ...result.items] : result.items;
    nextCursor.value = result.nextCursor;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

function open(id: string) {
  return navigateTo({
    path: `/officer/${id}`,
    query: agencyId.value ? { agencyId: agencyId.value } : undefined,
  });
}

/**
 * An unhandled rejection here used to abort the rest of the hook, leaving the page
 * with no agency, no data and no error — every control then did nothing when
 * clicked. Surface the failure and let the user retry.
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

// Only react to changes the user makes; the initial load is bootstrap's job.
watch([agencyId, status, tier, sort], () => {
  if (!agenciesLoaded.value) {
    return;
  }
  void load();
});
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <PageHeader
      :title="t('officer.queue.title')"
      :subtitle="t('officer.queue.subtitle')"
      icon="i-tabler-inbox"
      max-width="max-w-7xl"
    >
      <template #actions>
        <AgencySwitcher v-model="agencyId" :agencies="agencies" />
      </template>
    </PageHeader>

    <UAlert
      v-if="agencies.length === 0 && error"
      color="error"
      variant="subtle"
      :title="t('officer.queue.error')"
      :description="error"
    >
      <template #actions>
        <UButton color="error" variant="soft" :label="t('officer.common.retry')" @click="retry()" />
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
      <div class="flex flex-wrap gap-3">
        <UFormField :label="t('officer.queue.statusFilter')" class="w-full sm:w-56">
          <USelect v-model="status" :items="statusItems" class="w-full" />
        </UFormField>
        <UFormField :label="t('officer.queue.tierFilter')" class="w-full sm:w-56">
          <USelect v-model="tier" :items="tierItems" class="w-full" />
        </UFormField>
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="t('officer.queue.error')"
        :description="error"
      >
        <template #actions>
          <UButton
            color="error"
            variant="soft"
            :label="t('officer.common.retry')"
            @click="retry()"
          />
        </template>
      </UAlert>

      <QueueTable
        :items="items"
        :loading="loading"
        :sort="sort"
        @open="open"
        @update:sort="(value) => (sort = value)"
      />

      <div v-if="nextCursor" class="flex justify-center">
        <UButton
          color="neutral"
          variant="soft"
          :loading="loading"
          :label="t('officer.queue.loadMore')"
          @click="load(true)"
        />
      </div>
    </template>
  </div>
</template>
