<script setup lang="ts">
import FindingsList from "~/components/findings/FindingsList.vue";

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
const { selectedCompanyId } = useSelectedCompany();

const companyId = computed(() => selectedCompanyId.value ?? "");

const subjectType = computed<FindingSubjectType | null>(() => {
  const value = route.query.subjectType;
  if (value === "case" || value === "submission" || value === "company" || value === "document") {
    return value;
  }
  return selectedCompanyId.value ? "company" : null;
});

const subjectId = computed(() => {
  const value = route.query.subjectId;
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return selectedCompanyId.value ?? "";
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
  <div class="mx-auto w-full max-w-7xl">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ t("checks.title") }}
        </h1>
        <p class="text-sm text-muted">{{ t("checks.subtitle") }}</p>
      </div>
      <UButton icon="i-tabler-reload" :loading="running" :disabled="!valid" @click="rerun">
        {{ t("checks.rerun") }}
      </UButton>
    </div>

    <UAlert
      v-if="!valid"
      class="mt-6"
      color="neutral"
      variant="soft"
      icon="i-tabler-info-circle"
      :description="t('checks.missingSubject')"
    />

    <template v-else>
      <div v-if="latestRun" class="mt-4 flex flex-wrap items-center gap-2">
        <UBadge color="neutral" variant="soft" size="sm">
          {{ t("checks.latestRun") }}
        </UBadge>
        <UBadge :color="runColor(latestRun.status)" variant="subtle" size="sm">
          {{ t(`checks.runStatus.${latestRun.status}`) }}
        </UBadge>
        <span class="text-xs text-muted">
          {{ t("checks.findingsCount", { count: findings.length }) }}
        </span>
      </div>

      <UAlert
        v-if="error"
        class="mt-4"
        color="error"
        variant="soft"
        icon="i-tabler-alert-triangle"
        :description="t('checks.loadError')"
      />

      <div v-if="pending" class="mt-6 grid gap-3 md:grid-cols-2">
        <USkeleton v-for="n in 4" :key="n" class="h-28 w-full" />
      </div>

      <div v-else-if="findings.length > 0" class="mt-6">
        <FindingsList :findings="findings" :company-id="companyId" />
      </div>

      <UAlert
        v-else
        class="mt-6"
        color="success"
        variant="soft"
        icon="i-tabler-circle-check"
        :title="t('checks.empty')"
        :description="t('checks.emptyDescription')"
      />
    </template>
  </div>
</template>
