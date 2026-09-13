<script setup lang="ts">
import FindingDetail from "~/components/findings/FindingDetail.vue";
import FindingNotesHistory from "~/components/findings/FindingNotesHistory.vue";
import FindingStatusActions from "~/components/findings/FindingStatusActions.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

type FindingStatus = "open" | "resolved" | "waived" | "acknowledged";
type FindingSubjectType = "case" | "submission" | "company" | "document";

type Finding = {
  id: string;
  checkRunId: string;
  severity: "info" | "warning" | "error" | "blocker";
  code: string;
  title: string;
  messagePlain: string;
  suggestedFix: string | null;
  comparedRefs: unknown;
  status: FindingStatus;
  createdAt: string | Date;
};

type FindingNote = {
  id: string;
  kind: "note" | "explanation";
  body: string;
  createdAt: string | Date;
};

type CheckRun = {
  id: string;
  subjectType: FindingSubjectType;
  subjectId: string;
};

definePageMeta({ layout: "app", middleware: "auth" });

const route = useRoute();
const api = useApi();
const { t } = useI18n();
const { accessibleCompanyId } = useSelectedCompany();

const findingId = computed(() => String(route.params.findingId ?? ""));
const companyId = computed(() => accessibleCompanyId.value ?? "");
const valid = computed(() => Boolean(companyId.value && findingId.value));

const { data, pending, error, refresh } = await useAsyncData(
  `finding-${findingId.value}`,
  async () => {
    if (!valid.value) {
      return {
        finding: null as Finding | null,
        notes: [] as FindingNote[],
        run: null as CheckRun | null,
      };
    }
    const [rows, notes] = await Promise.all([
      api.checks.listFindings({
        companyId: companyId.value,
        findingId: findingId.value,
        limit: 1,
      }),
      api.checks.listNotes({ companyId: companyId.value, findingId: findingId.value }),
    ]);
    const finding = (rows[0] ?? null) as Finding | null;
    let run: CheckRun | null = null;
    if (finding) {
      const result = await api.checks.getRun({
        companyId: companyId.value,
        runId: finding.checkRunId,
      });
      run = result.run as CheckRun;
    }
    return { finding, notes: notes as FindingNote[], run };
  },
  { watch: [findingId, companyId] },
);

const finding = computed(() => data.value?.finding ?? null);
const notes = computed(() => data.value?.notes ?? []);
const run = computed(() => data.value?.run ?? null);

const backLink = computed(() => ({
  path: "/findings",
  query: {
    companyId: companyId.value,
    subjectType: run.value?.subjectType,
    subjectId: run.value?.subjectId,
  },
}));

const busy = ref(false);

async function changeStatus(status: FindingStatus) {
  if (!finding.value) {
    return;
  }
  busy.value = true;
  try {
    await api.checks.setFindingStatus({
      companyId: companyId.value,
      findingId: findingId.value,
      status,
    });
    await refresh();
  } finally {
    busy.value = false;
  }
}

async function addNote(body: string) {
  busy.value = true;
  try {
    await api.checks.addNote({
      companyId: companyId.value,
      findingId: findingId.value,
      body,
    });
    await refresh();
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6">
    <UButton
      :to="backLink"
      icon="i-tabler-arrow-left"
      color="neutral"
      variant="ghost"
      :ui="{ leadingIcon: 'rtl:rotate-180' }"
    >
      {{ t("checks.actions.back") }}
    </UButton>

    <UAlert
      v-if="!valid"
      color="neutral"
      variant="soft"
      icon="i-tabler-info-circle"
      :description="t('checks.missingSubject')"
    />

    <LoadingState v-else-if="pending" variant="skeleton-list" :count="3" />

    <UAlert
      v-else-if="error || !finding"
      color="error"
      variant="soft"
      icon="i-tabler-alert-triangle"
      :description="t('checks.detail.notFound')"
    />

    <div v-else class="space-y-8">
      <FindingDetail :finding="finding" />

      <FindingStatusActions :status="finding.status" :busy="busy" @change="changeStatus" />

      <FindingNotesHistory :notes="notes" :busy="busy" @add="addNote" />
    </div>
  </div>
</template>
