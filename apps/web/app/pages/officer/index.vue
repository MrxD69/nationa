<script setup lang="ts">
import QueueTable from "~/components/officer/QueueTable.vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

definePageMeta({ layout: "officer", middleware: "auth" });

// Sentinel for the "Toutes" option: Reka UI forbids empty-string item values.
const ALL = "all";
const filterValue = (v: string): string | undefined => (v === ALL ? undefined : v);

const { t } = useI18n();
const api = useApi();
const toast = useToast();

const { agencies, agencyId, ready, error: agencyError, ensureLoaded } = useOfficerAgency();

type QueueItem = {
  id: string;
  status: string;
  cleanlinessTier: string;
  cleanlinessScore?: string | number | null;
  submittedAt?: string | Date | null;
  ageDays: number | null;
  dueAt?: string | Date | null;
  slaBucket: "on_time" | "at_risk" | "breached" | "unknown";
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  isMine?: boolean;
  findingsCount: number;
  blockers: number;
  company?: {
    id?: string | null;
    legalName?: string | null;
    legalNameAr?: string | null;
    tradeName?: string | null;
    uniqueIdentifier?: string | null;
  } | null;
};

const status = ref(ALL);
const tier = ref(ALL);
const slaBucket = ref(ALL);
const assignment = ref(ALL);
const sort = ref<"priority" | "submittedAt" | "cleanliness">("priority");

const items = ref<QueueItem[]>([]);
const nextCursor = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const claimingId = ref<string | null>(null);
const bootstrapped = ref(false);

const statusItems = computed(() => [
  { label: t("officerOps.queue.allStatuses"), value: ALL },
  { label: t("submissions.status.queued"), value: "queued" },
  { label: t("submissions.status.in_review"), value: "in_review" },
  { label: t("submissions.status.escalated"), value: "escalated" },
  { label: t("submissions.status.returned"), value: "returned" },
  { label: t("submissions.status.approved"), value: "approved" },
  { label: t("submissions.status.rejected"), value: "rejected" },
]);

const tierItems = computed(() => [
  { label: t("officerOps.queue.allTiers"), value: ALL },
  { label: t("submissions.cleanliness.clean"), value: "clean" },
  { label: t("submissions.cleanliness.minor_concern"), value: "minor_concern" },
  { label: t("submissions.cleanliness.needs_review"), value: "needs_review" },
]);

const slaItems = computed(() => [
  { label: t("officerOps.queue.allSla"), value: ALL },
  { label: t("officerOps.sla.onTime"), value: "on_time" },
  { label: t("officerOps.sla.atRisk"), value: "at_risk" },
  { label: t("officerOps.sla.breached"), value: "breached" },
]);

const assignmentItems = computed(() => [
  { label: t("officerOps.queue.allAssignments"), value: ALL },
  { label: t("officerOps.queue.mine"), value: "mine" },
  { label: t("officerOps.queue.unassigned"), value: "unassigned" },
]);

const sortItems = computed(() => [
  { label: t("officerOps.queue.sortPriority"), value: "priority" },
  { label: t("officerOps.queue.sortSubmitted"), value: "submittedAt" },
  { label: t("officerOps.queue.sortQuality"), value: "cleanliness" },
]);

async function load(append = false) {
  if (!agencyId.value) {
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await api.officer.opsQueue({
      agencyId: agencyId.value,
      status: filterValue(status.value),
      tier: filterValue(tier.value),
      slaBucket: filterValue(slaBucket.value),
      assignment: filterValue(assignment.value),
      sort: sort.value as never,
      limit: 25,
      cursor: append ? (nextCursor.value ?? undefined) : undefined,
    });
    items.value = append ? [...items.value, ...result.items] : result.items;
    nextCursor.value = result.nextCursor ?? null;
  } catch {
    error.value = t("officerOps.queue.error");
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

async function claim(id: string) {
  if (!agencyId.value || claimingId.value) {
    return;
  }
  claimingId.value = id;
  try {
    await api.officer.claim({ agencyId: agencyId.value, submissionId: id });
    toast.add({ title: t("officerOps.queue.claimSuccess"), color: "success" });
    await load();
  } catch {
    toast.add({ title: t("officerOps.queue.claimError"), color: "error" });
  } finally {
    claimingId.value = null;
  }
}

function agencyErrorText(): string {
  return t("officerOps.queue.agencyError");
}

onMounted(async () => {
  await ensureLoaded();
  await load();
  bootstrapped.value = true;
});

watch([agencyId, status, tier, slaBucket, assignment, sort], () => {
  if (bootstrapped.value && ready.value && agencyId.value) {
    void load();
  }
});
</script>

<template>
  <div class="w-full">
    <LoadingState
      v-if="!ready"
      variant="skeleton-grid"
      :count="6"
      :label="t('officerOps.common.loading')"
    />

    <UAlert
      v-else-if="agencyError"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('officerOps.queue.error')"
      :description="agencyErrorText()"
    >
      <template #actions>
        <UButton
          size="md"
          color="error"
          variant="soft"
          icon="i-tabler-refresh"
          :label="t('officerOps.common.retry')"
          @click="ensureLoaded()"
        />
      </template>
    </UAlert>

    <EmptyState
      v-else-if="agencies.length === 0"
      icon="i-tabler-building-off"
      :title="t('officerOps.queue.noAgencies')"
      :description="t('officerOps.queue.noAgenciesDescription')"
    />

    <template v-else>
      <!-- One compact inline filter row; single hairline below spans the full width. -->
      <div class="flex flex-wrap items-center gap-2 border-b border-default pb-3">
        <USelect
          v-model="status"
          :items="statusItems"
          size="md"
          icon="i-tabler-list-check"
          :placeholder="t('officerOps.queue.filters.status')"
          class="w-full sm:w-44"
        />
        <USelect
          v-model="tier"
          :items="tierItems"
          size="md"
          icon="i-tabler-sparkles"
          :placeholder="t('officerOps.queue.filters.tier')"
          class="w-full sm:w-44"
        />
        <USelect
          v-model="slaBucket"
          :items="slaItems"
          size="md"
          icon="i-tabler-clock"
          :placeholder="t('officerOps.queue.filters.sla')"
          class="w-full sm:w-44"
        />
        <USelect
          v-model="assignment"
          :items="assignmentItems"
          size="md"
          icon="i-tabler-user-check"
          :placeholder="t('officerOps.queue.filters.assignment')"
          class="w-full sm:w-44"
        />
        <USelect
          v-model="sort"
          :items="sortItems"
          size="md"
          icon="i-tabler-arrows-sort"
          :placeholder="t('officerOps.queue.filters.sort')"
          class="w-full sm:w-40"
        />

        <UButton
          to="/officer/team"
          size="md"
          color="neutral"
          variant="soft"
          icon="i-tabler-users-group"
          :label="t('officerOps.queue.teamAction')"
          class="ms-auto"
        />
      </div>

      <UAlert
        v-if="error"
        class="mt-4"
        color="error"
        variant="subtle"
        icon="i-tabler-alert-triangle"
        :title="t('officerOps.queue.error')"
        :description="error"
      >
        <template #actions>
          <UButton
            size="md"
            color="error"
            variant="soft"
            icon="i-tabler-refresh"
            :label="t('officerOps.common.retry')"
            @click="load()"
          />
        </template>
      </UAlert>

      <QueueTable
        class="mt-2"
        :items="items"
        :loading="loading"
        :claiming-id="claimingId"
        @open="open"
        @claim="claim"
      />

      <div v-if="nextCursor" class="mt-4 flex justify-center">
        <UButton
          size="md"
          color="neutral"
          variant="soft"
          icon="i-tabler-plus"
          :loading="loading"
          :label="t('officerOps.queue.loadMore')"
          @click="load(true)"
        />
      </div>
    </template>
  </div>
</template>
