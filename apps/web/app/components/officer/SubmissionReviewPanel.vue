<script setup lang="ts">
import FindingsList from "./FindingsList.vue";
import SubmissionTimeline from "~/components/submission/SubmissionTimeline.vue";

type ReviewPayload = {
  submission: {
    id: string;
    status: string;
    cleanlinessTier: string;
    cleanlinessScore?: string | number | null;
    submittedAt?: string | Date | null;
    submittedByUserId?: string | null;
    submittedByEmail?: string | null;
    caseId?: string | null;
    slaBucket?: "on_time" | "at_risk" | "breached" | "unknown" | null;
    dueAt?: string | Date | null;
    ageDays?: number | null;
    assigneeUserId?: string | null;
    assigneeName?: string | null;
    isMine?: boolean;
    deficiencyDueAt?: string | Date | null;
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
    data?: Record<string, unknown> | null;
  }>;
  patterns?: {
    commonFindings: Array<{ code: string; count: number }>;
    commonRejectionReasons: Array<{ reason: string; count: number }>;
  } | null;
};

const props = defineProps<{ payload: ReviewPayload }>();

const emit = defineEmits<{ decide: [] }>();

const { t, locale, te } = useI18n();

const submission = computed(() => props.payload.submission);

// Never print the raw submitter UUID: show the email when the API provides one,
// otherwise a neutral label.
const submitterLabel = computed(
  () => submission.value.submittedByEmail || t("officer.review.unknownUser"),
);

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(locale.value);
}

function findingLabel(code: string): string {
  const key = `checks.findings.${code}.title`;
  return te(key) ? t(key) : t("officer.analytics.unknownFinding");
}

const blockers = computed(() =>
  props.payload.findings.filter((finding) => finding.severity === "blocker"),
);

/**
 * The deadline may arrive on the submission itself or, on older responses, only
 * inside the deficiency activity entry. Read both, defensively.
 */
const deficiencyDueAt = computed<string | null>(() => {
  const direct = submission.value.deficiencyDueAt;
  if (direct) {
    return typeof direct === "string" ? direct : new Date(direct).toISOString();
  }
  const entry = props.payload.activity?.find(
    (event) => event.action === "submission.deficiency.issued",
  );
  const value = entry?.data?.dueAt;
  return typeof value === "string" && value.length > 0 ? value : null;
});

const deficiencyBanner = computed(() =>
  deficiencyDueAt.value
    ? t("officerOps.review.deficiencyBanner", { date: formatDate(deficiencyDueAt.value) })
    : null,
);
</script>

<template>
  <div class="flex flex-col">
    <UAlert
      v-if="deficiencyBanner"
      color="warning"
      variant="subtle"
      icon="i-tabler-clock-exclamation"
      :title="t('officerOps.deficiency.title')"
      :description="deficiencyBanner"
    />

    <!-- Identity fields, hairline separated from the findings that follow. -->
    <dl class="flex flex-wrap gap-x-6 gap-y-1 text-sm xl:ps-5">
      <div class="flex items-baseline gap-1.5">
        <dt class="text-muted">{{ t("officer.review.submittedAt") }}</dt>
        <dd class="text-toned">{{ formatDate(submission.submittedAt) }}</dd>
      </div>
      <div class="flex min-w-0 items-baseline gap-1.5">
        <dt class="text-muted">{{ t("officer.review.submitter") }}</dt>
        <dd class="truncate text-toned">{{ submitterLabel }}</dd>
      </div>
      <div class="flex items-baseline gap-1.5">
        <dt class="text-muted">{{ t("officer.review.case") }}</dt>
        <dd>
          <NuxtLink
            v-if="submission.caseId"
            :to="`/cases/${submission.caseId}`"
            class="inline-flex items-center gap-1 text-primary transition-control hover:underline"
          >
            {{ t("officer.review.openCase") }}
            <UIcon name="i-tabler-external-link" class="size-3.5 shrink-0" />
          </NuxtLink>
          <span v-else class="text-muted">—</span>
        </dd>
      </div>
    </dl>

    <section class="border-t border-default pt-4">
      <div class="flex items-center gap-2 xl:ps-5">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">
          {{ t("officer.review.findings") }}
        </h2>
        <UBadge v-if="blockers.length > 0" color="error" variant="subtle" size="sm">
          {{ blockers.length }}
        </UBadge>
      </div>

      <div class="pt-2">
        <FindingsList :findings="payload.findings" />
      </div>
    </section>

    <section v-if="payload.patterns" class="border-t border-default pt-4">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-muted xl:ps-5">
        {{ t("officer.review.pattern") }}
      </h2>

      <div class="grid gap-4 pt-3 sm:grid-cols-2">
        <div>
          <h3 class="text-xs font-medium uppercase tracking-wide text-dimmed xl:ps-5">
            {{ t("officer.review.patternFindings") }}
          </h3>
          <ul
            v-if="payload.patterns.commonFindings.length > 0"
            class="mt-1 w-full divide-y divide-default"
          >
            <li
              v-for="item in payload.patterns.commonFindings"
              :key="item.code"
              class="flex items-center justify-between gap-2 py-2 text-sm xl:ps-5"
            >
              <span class="truncate text-toned">{{ findingLabel(item.code) }}</span>
              <span class="shrink-0 tabular text-muted">{{ item.count }}</span>
            </li>
          </ul>
          <p v-else class="mt-1 text-sm text-muted xl:ps-5">{{ t("officer.review.noPattern") }}</p>
        </div>

        <div>
          <h3 class="text-xs font-medium uppercase tracking-wide text-dimmed xl:ps-5">
            {{ t("officer.review.patternReasons") }}
          </h3>
          <ul
            v-if="payload.patterns.commonRejectionReasons.length > 0"
            class="mt-1 w-full divide-y divide-default"
          >
            <li
              v-for="item in payload.patterns.commonRejectionReasons"
              :key="item.reason"
              class="flex items-center justify-between gap-2 py-2 text-sm xl:ps-5"
            >
              <span class="truncate text-toned">{{ item.reason }}</span>
              <span class="shrink-0 tabular text-muted">{{ item.count }}</span>
            </li>
          </ul>
          <p v-else class="mt-1 text-sm text-muted xl:ps-5">{{ t("officer.review.noPattern") }}</p>
        </div>
      </div>
    </section>

    <section class="border-t border-default pt-4">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-muted xl:ps-5">
        {{ t("submissions.timeline.title") }}
      </h2>
      <div class="pt-2 xl:ps-5">
        <SubmissionTimeline :events="payload.activity" />
      </div>
    </section>

    <!-- Pinned so the decision action never scrolls away from the reviewer. -->
    <div
      class="sticky bottom-0 z-20 mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-default bg-default/90 px-4 py-3 backdrop-blur"
    >
      <UButton
        size="md"
        icon="i-tabler-gavel"
        :label="t('officer.review.decision')"
        :disabled="submission.status === 'approved' || submission.status === 'rejected'"
        @click="emit('decide')"
      />
    </div>
  </div>
</template>
