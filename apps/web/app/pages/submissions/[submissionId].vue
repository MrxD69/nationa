<script setup lang="ts">
import FindingsList from "~/components/findings/FindingsList.vue";
import BlockerAlert from "~/components/submission/BlockerAlert.vue";
import SubmissionStatusBadge from "~/components/submission/SubmissionStatusBadge.vue";
import CleanlinessBadge from "~/components/submission/CleanlinessBadge.vue";
import SubmissionTimeline from "~/components/submission/SubmissionTimeline.vue";
import DocumentViewer from "~/components/officer/DocumentViewer.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const { t, locale } = useI18n();
const route = useRoute();
const api = useApi();
const { selectedCompanyId } = useSelectedCompany();

const submissionId = computed(() => String(route.params.submissionId ?? ""));
const companyId = computed(() => {
  if (selectedCompanyId.value) {
    return selectedCompanyId.value;
  }
  const value = route.query.companyId;
  return typeof value === "string" ? value : "";
});

type SubmissionFinding = {
  id: string;
  severity: "info" | "warning" | "error" | "blocker";
  code: string;
  title: string;
  messagePlain: string;
  suggestedFix?: string | null;
  comparedRefs: unknown;
  status: "open" | "resolved" | "waived" | "acknowledged";
};

const data = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const acknowledged = ref(false);
const resubmitting = ref(false);
const resubmitError = ref<string | null>(null);

const submission = computed(() => data.value?.submission ?? null);
const cleanlinessTier = computed(() => String(submission.value?.cleanlinessTier ?? ""));
const cleanlinessScore = computed(() => {
  const value = submission.value?.cleanlinessScore;
  return typeof value === "string" || typeof value === "number" ? value : null;
});
const company = computed(() => data.value?.company ?? null);
const agency = computed(() => data.value?.agency ?? null);
const findings = computed(() => (data.value?.findings ?? []) as SubmissionFinding[]);
const reviews = computed(() => (data.value?.reviews ?? []) as any[]);
const activity = computed(() => (data.value?.activity ?? []) as any[]);
const documents = computed(() => (data.value?.documents ?? []) as any[]);

const blockers = computed(() =>
  findings.value.filter(
    (finding) =>
      finding.severity === "blocker" &&
      (finding.status === "open" || finding.status === "acknowledged"),
  ),
);

const canResubmit = computed(() => {
  const status = String(submission.value?.status ?? "");
  if (status !== "rejected" && status !== "returned") {
    return false;
  }
  return blockers.value.length === 0 || acknowledged.value;
});

const latestReview = computed(() => reviews.value[0] ?? null);

const companyName = computed(() => {
  const value = company.value;
  if (!value) {
    return "";
  }
  const legalName = typeof value.legalName === "string" ? value.legalName : "";
  const legalNameAr = typeof value.legalNameAr === "string" ? value.legalNameAr : "";
  const tradeName = typeof value.tradeName === "string" ? value.tradeName : "";
  return locale.value === "ar" ? legalNameAr || legalName || tradeName : tradeName || legalName;
});

const agencyName = computed(() => {
  const value = agency.value;
  if (!value) {
    return "";
  }
  const nameFr = typeof value.nameFr === "string" ? value.nameFr : "";
  const nameAr = typeof value.nameAr === "string" ? value.nameAr : "";
  return locale.value === "ar" ? nameAr || nameFr : nameFr;
});

function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(locale.value);
}

async function load() {
  if (!companyId.value || !submissionId.value) {
    error.value = t("submissions.detail.notFound");
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    data.value = await api.submissions.get({
      companyId: companyId.value,
      submissionId: submissionId.value,
    });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

async function resubmit() {
  if (!canResubmit.value) {
    return;
  }
  resubmitting.value = true;
  resubmitError.value = null;
  try {
    await api.submissions.resubmit({
      companyId: companyId.value,
      submissionId: submissionId.value,
      acknowledgeBlockers: acknowledged.value,
    });
    acknowledged.value = false;
    await load();
  } catch (cause) {
    resubmitError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    resubmitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-6">
    <div class="flex items-center gap-2">
      <UButton
        to="/submissions"
        color="neutral"
        variant="ghost"
        icon="i-tabler-arrow-left"
        size="sm"
        :label="t('submissions.back')"
        :ui="{ leadingIcon: 'rtl:rotate-180' }"
      />
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-sm text-muted">
      <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
      <span>{{ t("submissions.loading") }}</span>
    </div>

    <UAlert
      v-else-if="error || !submission"
      color="error"
      variant="subtle"
      :title="t('submissions.detail.notFound')"
      :description="error ?? undefined"
    />

    <template v-else>
      <UCard>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <h1 class="truncate text-xl font-semibold text-highlighted">
              {{ companyName || t("submissions.detail.title") }}
            </h1>
            <p v-if="agencyName" class="text-xs text-muted">{{ agencyName }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <CleanlinessBadge :tier="cleanlinessTier" :score="cleanlinessScore" />
            <SubmissionStatusBadge :status="String(submission.status ?? '')" />
          </div>
        </div>

        <dl class="mt-4 grid gap-4 text-xs sm:grid-cols-3">
          <div>
            <dt class="text-muted">{{ t("submissions.detail.submittedAt") }}</dt>
            <dd class="text-toned">{{ formatDate(submission.submittedAt) }}</dd>
          </div>
          <div>
            <dt class="text-muted">{{ t("submissions.detail.decidedAt") }}</dt>
            <dd class="text-toned">{{ formatDate(submission.decidedAt) }}</dd>
          </div>
          <div>
            <dt class="text-muted">{{ t("submissions.detail.agency") }}</dt>
            <dd class="truncate text-toned">{{ agencyName || "—" }}</dd>
          </div>
        </dl>
      </UCard>

      <UAlert
        v-if="latestReview"
        color="neutral"
        variant="soft"
        icon="i-tabler-gavel"
        :title="t('submissions.detail.reason')"
        :description="String(latestReview.reason ?? '—')"
      />

      <BlockerAlert v-model:acknowledged="acknowledged" :blockers="blockers" />

      <UAlert
        v-if="resubmitError"
        color="error"
        variant="subtle"
        :title="t('submissions.error.title')"
        :description="resubmitError"
      />

      <div
        v-if="submission.status === 'rejected' || submission.status === 'returned'"
        class="flex justify-end"
      >
        <UButton
          icon="i-tabler-send"
          :loading="resubmitting"
          :disabled="!canResubmit"
          :label="t('submissions.detail.resubmit')"
          @click="resubmit"
        />
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <UCard>
          <template #header>
            <h2 class="text-sm font-semibold text-highlighted">
              {{ t("submissions.detail.findings") }}
            </h2>
          </template>
          <FindingsList v-if="findings.length > 0" :findings="findings" :company-id="companyId" />
          <p v-else class="text-sm text-muted">{{ t("submissions.detail.noFindings") }}</p>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-sm font-semibold text-highlighted">
              {{ t("submissions.timeline.title") }}
            </h2>
          </template>
          <SubmissionTimeline :events="activity" />
        </UCard>
      </div>

      <DocumentViewer :documents="documents" :company-id="companyId" />
    </template>
  </div>
</template>
