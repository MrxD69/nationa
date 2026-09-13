<script setup lang="ts">
import FindingsList from "~/components/findings/FindingsList.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import EmptyState from "~/components/ui/EmptyState.vue";

type FindingSubjectType = "case" | "submission" | "company" | "document";

type Finding = {
  id: string;
  severity: "info" | "warning" | "error" | "blocker";
  code: string;
  title: string;
  messagePlain: string;
  comparedRefs: unknown;
  status: "open" | "resolved" | "waived" | "acknowledged";
};

type CheckRun = {
  id: string;
  status: "queued" | "running" | "passed" | "failed" | "error";
  summary: { findingsCount?: number; blockingCount?: number } | null;
  createdAt: string | Date;
  completedAt: string | Date | null;
};

definePageMeta({ layout: "app", middleware: "auth" });

const route = useRoute();
const api = useApi();
const { t } = useI18n();
const { accessibleCompanyId } = useSelectedCompany();

const companyId = computed(() => accessibleCompanyId.value ?? "");

const subjectType = computed<FindingSubjectType | null>(() => {
  const value = route.query.subjectType;
  if (value === "case" || value === "submission" || value === "company" || value === "document") {
    return value;
  }
  return accessibleCompanyId.value ? "company" : null;
});

const subjectId = computed(() => {
  const value = route.query.subjectId;
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return accessibleCompanyId.value ?? "";
});

const valid = computed(() => Boolean(companyId.value && subjectType.value && subjectId.value));

const { data, pending, error, refresh } = await useAsyncData(
  "checks-findings",
  async () => {
    const type = subjectType.value;
    if (!valid.value || !type) {
      return { findings: [] as Finding[], runs: [] as CheckRun[] };
    }
    const [findings, runs] = await Promise.all([
      api.checks.listFindings({
        companyId: companyId.value,
        subjectType: type,
        subjectId: subjectId.value,
      }),
      api.checks.listRuns({
        companyId: companyId.value,
        subjectType: type,
        subjectId: subjectId.value,
        limit: 5,
      }),
    ]);
    return { findings: findings as Finding[], runs: runs as CheckRun[] };
  },
  { watch: [companyId, subjectType, subjectId] },
);

const findings = computed(() => data.value?.findings ?? []);
const latestRun = computed(() => data.value?.runs?.[0] ?? null);

function runColor(status: CheckRun["status"]) {
  if (status === "passed") {
    return "success" as const;
  }
  if (status === "failed") {
    return "error" as const;
  }
  return "neutral" as const;
}

const running = ref(false);

async function rerun() {
  const type = subjectType.value;
  if (!valid.value || !type) {
    return;
  }
  running.value = true;
  try {
    await api.checks.run({
      companyId: companyId.value,
      subjectType: type,
      subjectId: subjectId.value,
    });
    await refresh();
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6">
    <PageHeader
      :title="t('checks.title')"
      :subtitle="t('checks.subtitle')"
      icon="i-tabler-shield-check"
      max-width="max-w-none"
    >
      <template #actions>
        <UButton
          icon="i-tabler-reload"
          :loading="running"
          :disabled="!valid"
          :label="t('checks.rerun')"
          @click="rerun"
        />
      </template>
    </PageHeader>

    <UAlert
      v-if="!valid"
      color="neutral"
      variant="soft"
      icon="i-tabler-info-circle"
      :description="t('checks.missingSubject')"
    />

    <template v-else>
      <div v-if="latestRun" class="flex flex-wrap items-center gap-2">
        <UBadge color="neutral" variant="soft" size="lg">
          {{ t("checks.latestRun") }}
        </UBadge>
        <UBadge :color="runColor(latestRun.status)" variant="subtle" size="lg">
          {{ t(`checks.runStatus.${latestRun.status}`) }}
        </UBadge>
        <span class="text-sm text-muted tabular">
          {{ t("checks.findingsCount", { count: findings.length }) }}
        </span>
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-tabler-alert-triangle"
        :title="t('checks.loadError')"
      >
        <template #actions>
          <UButton
            color="error"
            variant="soft"
            :label="t('submissions.error.retry')"
            @click="refresh()"
          />
        </template>
      </UAlert>

      <LoadingState v-if="pending" variant="skeleton-grid" :count="6" />

      <template v-else-if="!error">
        <FindingsList v-if="findings.length > 0" :findings="findings" :company-id="companyId" />

        <EmptyState
          v-else
          icon="i-tabler-circle-check"
          :title="t('checks.empty')"
          :description="t('checks.emptyDescription')"
        />
      </template>
    </template>
  </div>
</template>
