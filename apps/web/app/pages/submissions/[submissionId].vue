<script setup lang="ts">
import FindingsList from "~/components/findings/FindingsList.vue";
import BlockerAlert from "~/components/submission/BlockerAlert.vue";
import SubmissionStatusBadge from "~/components/submission/SubmissionStatusBadge.vue";
import CleanlinessBadge from "~/components/submission/CleanlinessBadge.vue";
import SubmissionTimeline from "~/components/submission/SubmissionTimeline.vue";
import DocumentViewer from "~/components/officer/DocumentViewer.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import SectionHeader from "~/components/ui/SectionHeader.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const { t, locale } = useI18n();
const route = useRoute();
const api = useApi();
const { accessibleCompanyId } = useSelectedCompany();

const submissionId = computed(() => String(route.params.submissionId ?? ""));
const companyId = computed(() => {
  if (accessibleCompanyId.value) {
    return accessibleCompanyId.value;
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
const confirmResubmitOpen = ref(false);

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

const isReturned = computed(() => {
  const status = String(submission.value?.status ?? "");
  return status === "rejected" || status === "returned";
});

const canResubmit = computed(() => {
  if (!isReturned.value) {
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
  confirmResubmitOpen.value = false;
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
  <div class="mx-auto w-full max-w-6xl space-y-6">
    <PageHeader
      :title="companyName || t('submissions.detail.title')"
      :subtitle="agencyName || undefined"
      icon="i-tabler-file-text"
      back-to="/submissions"
      :back-label="t('submissions.back')"
      max-width="max-w-none"
    >
      <template #actions>
        <CleanlinessBadge :tier="cleanlinessTier" :score="cleanlinessScore" />
        <SubmissionStatusBadge :status="String(submission?.status ?? '')" />
      </template>

      <template #meta>
        <dl class="grid gap-4 text-base sm:grid-cols-3">
          <div>
            <dt class="text-muted">{{ t("submissions.detail.submittedAt") }}</dt>
            <dd class="text-toned tabular">{{ formatDate(submission?.submittedAt) }}</dd>
          </div>
          <div>
            <dt class="text-muted">{{ t("submissions.detail.decidedAt") }}</dt>
            <dd class="text-toned tabular">{{ formatDate(submission?.decidedAt) }}</dd>
          </div>
          <div>
            <dt class="text-muted">{{ t("submissions.detail.agency") }}</dt>
            <dd class="truncate text-toned">{{ agencyName || "—" }}</dd>
          </div>
        </dl>
      </template>
    </PageHeader>

    <LoadingState v-if="loading" variant="skeleton-list" :count="3" />

    <UAlert
      v-else-if="error || !submission"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('submissions.detail.notFound')"
      :description="error ?? undefined"
    />

    <template v-else>
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
        icon="i-tabler-alert-triangle"
        :title="t('submissions.error.title')"
        :description="resubmitError"
      />

      <div v-if="isReturned" class="flex justify-end">
        <UButton
          icon="i-tabler-send"
          :disabled="!canResubmit"
          :label="t('submissions.detail.resubmit')"
          @click="confirmResubmitOpen = true"
        />
      </div>

      <!-- Sections of one submission as plain bands separated by hairlines, not cards. -->
      <div class="divide-y divide-default">
        <section class="space-y-4 py-5 first:pt-0">
          <SectionHeader
            :title="t('submissions.detail.findings')"
            icon="i-tabler-list-search"
            :count="findings.length"
          />
          <FindingsList v-if="findings.length > 0" :findings="findings" :company-id="companyId" />
          <p v-else class="text-base text-muted">{{ t("submissions.detail.noFindings") }}</p>
        </section>

        <section class="space-y-4 py-5">
          <SectionHeader
            :title="t('submissions.timeline.title')"
            icon="i-tabler-history"
            :count="activity.length"
          />
          <SubmissionTimeline :events="activity" />
        </section>
      </div>

      <DocumentViewer :documents="documents" :company-id="companyId" />
    </template>

    <UModal v-model:open="confirmResubmitOpen">
      <template #header>
        <h2 class="font-medium text-highlighted">
          {{ t("submissions.detail.confirmResubmitTitle") }}
        </h2>
      </template>

      <template #body>
        <p class="text-base text-toned">
          {{ t("submissions.detail.confirmResubmitBody") }}
        </p>
      </template>

      <template #footer>
        <div class="flex w-full items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="t('submissions.detail.cancel')"
            @click="confirmResubmitOpen = false"
          />
          <UButton
            icon="i-tabler-send"
            :loading="resubmitting"
            :label="t('submissions.detail.confirmResubmit')"
            @click="resubmit"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
