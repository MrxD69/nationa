<script setup lang="ts">
import FindingsList from "./FindingsList.vue";
import SubmissionTimeline from "~/components/submission/SubmissionTimeline.vue";
import CleanlinessBadge from "~/components/submission/CleanlinessBadge.vue";
import SubmissionStatusBadge from "~/components/submission/SubmissionStatusBadge.vue";

type ReviewPayload = {
  submission: {
    id: string;
    status: string;
    cleanlinessTier: string;
    cleanlinessScore?: string | number | null;
    submittedAt?: string | Date | null;
    submittedByUserId?: string | null;
    caseId?: string | null;
  };
  company?: {
    legalName?: string | null;
    legalNameAr?: string | null;
    tradeName?: string | null;
    uniqueIdentifier?: string | null;
  } | null;
  findings: Array<{
    id: string;
    severity: "info" | "warning" | "error" | "blocker";
    code: string;
    title: string;
    messagePlain: string;
    suggestedFix?: string | null;
    comparedRefs?: unknown;
    status: string;
  }>;
  activity: Array<{
    id?: string;
    action?: string | null;
    summary?: string | null;
    createdAt?: string | Date | null;
  }>;
  patterns?: {
    commonFindings: Array<{ code: string; count: number }>;
    commonRejectionReasons: Array<{ reason: string; count: number }>;
  } | null;
};

const props = defineProps<{ payload: ReviewPayload }>();

const emit = defineEmits<{ decide: [] }>();

const { t, locale, te } = useI18n();

const company = computed(() => props.payload.company ?? null);
const submission = computed(() => props.payload.submission);

const companyName = computed(() => {
  const value = company.value;
  if (!value) {
    return "";
  }
  return locale.value === "ar"
    ? value.legalNameAr || value.legalName || value.tradeName || ""
    : value.tradeName || value.legalName || "";
});

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(locale.value);
}

function findingLabel(code: string): string {
  const key = `checks.findings.${code}.title`;
  return te(key) ? t(key) : code;
}

const blockers = computed(() =>
  props.payload.findings.filter((finding) => finding.severity === "blocker"),
);
</script>

<template>
  <!--
    One bordered surface with internal dividers rather than four stacked cards:
    these are sections of a single review, not four independent objects.
  -->
  <div class="divide-y divide-default overflow-hidden rounded-lg border border-default">
    <section class="space-y-4 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 space-y-1">
          <h1 class="truncate text-xl font-semibold text-highlighted">
            {{ companyName || t("officer.review.title") }}
          </h1>
          <p v-if="company?.uniqueIdentifier" class="text-base text-muted">
            {{ company.uniqueIdentifier }}
          </p>
        </div>
        <SubmissionStatusBadge :status="submission.status" />
      </div>

      <dl class="grid grid-cols-1 gap-4 text-base sm:grid-cols-2">
        <div>
          <dt class="text-muted">{{ t("officer.review.submittedAt") }}</dt>
          <dd class="text-toned">{{ formatDate(submission.submittedAt) }}</dd>
        </div>
        <div>
          <dt class="text-muted">{{ t("officer.review.cleanliness") }}</dt>
          <dd class="mt-0.5">
            <CleanlinessBadge
              :tier="submission.cleanlinessTier"
              :score="submission.cleanlinessScore"
            />
          </dd>
        </div>
        <div>
          <dt class="text-muted">{{ t("officer.review.submitter") }}</dt>
          <dd class="truncate text-toned">{{ submission.submittedByUserId ?? "—" }}</dd>
        </div>
        <div>
          <dt class="text-muted">{{ t("officer.review.case") }}</dt>
          <dd class="truncate text-toned">{{ submission.caseId ?? "—" }}</dd>
        </div>
      </dl>

      <UButton
        block
        icon="i-tabler-gavel"
        :label="t('officer.review.decision')"
        :disabled="submission.status === 'approved' || submission.status === 'rejected'"
        @click="emit('decide')"
      />
    </section>

    <section class="space-y-4 p-5">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-semibold text-highlighted">{{ t("officer.review.findings") }}</h2>
        <UBadge v-if="blockers.length > 0" color="error" variant="subtle" size="lg">
          {{ blockers.length }}
        </UBadge>
      </div>

      <FindingsList :findings="payload.findings" />
    </section>

    <section v-if="payload.patterns" class="space-y-4 p-5">
      <h2 class="text-lg font-semibold text-highlighted">{{ t("officer.review.pattern") }}</h2>
      <p class="text-base text-muted">{{ t("officer.review.patternDescription") }}</p>

      <div class="space-y-5">
        <div>
          <h3 class="text-base font-medium text-muted">
            {{ t("officer.review.patternFindings") }}
          </h3>
          <ul v-if="payload.patterns.commonFindings.length > 0" class="mt-2 space-y-2">
            <li
              v-for="item in payload.patterns.commonFindings"
              :key="item.code"
              class="flex items-center justify-between gap-2 text-base"
            >
              <span class="truncate text-toned">{{ findingLabel(item.code) }}</span>
              <UBadge color="neutral" variant="soft" size="lg">{{ item.count }}</UBadge>
            </li>
          </ul>
          <p v-else class="mt-2 text-base text-muted">{{ t("officer.review.noPattern") }}</p>
        </div>

        <div>
          <h3 class="text-base font-medium text-muted">
            {{ t("officer.review.patternReasons") }}
          </h3>
          <ul v-if="payload.patterns.commonRejectionReasons.length > 0" class="mt-2 space-y-2">
            <li
              v-for="item in payload.patterns.commonRejectionReasons"
              :key="item.reason"
              class="flex items-center justify-between gap-2 text-base"
            >
              <span class="truncate text-toned">{{ item.reason }}</span>
              <UBadge color="neutral" variant="soft" size="lg">{{ item.count }}</UBadge>
            </li>
          </ul>
          <p v-else class="mt-2 text-base text-muted">{{ t("officer.review.noPattern") }}</p>
        </div>
      </div>
    </section>

    <section class="space-y-4 p-5">
      <h2 class="text-lg font-semibold text-highlighted">
        {{ t("submissions.timeline.title") }}
      </h2>
      <SubmissionTimeline :events="payload.activity" />
    </section>
  </div>
</template>
