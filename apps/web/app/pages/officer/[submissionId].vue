<script setup lang="ts">
import DocumentViewer from "~/components/officer/DocumentViewer.vue";
import SubmissionReviewPanel from "~/components/officer/SubmissionReviewPanel.vue";
import DecisionModal from "~/components/officer/DecisionModal.vue";
import AssignmentControls from "~/components/officer/ops/AssignmentControls.vue";
import SlaBadge from "~/components/officer/ui/SlaBadge.vue";
import SubmissionStatusBadge from "~/components/submission/SubmissionStatusBadge.vue";
import CleanlinessBadge from "~/components/submission/CleanlinessBadge.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

definePageMeta({ layout: "officer", middleware: "auth" });

const { t, locale } = useI18n();
const route = useRoute();
const api = useApi();

const { agencyId: sharedAgencyId, ensureLoaded } = useOfficerAgency();

const submissionId = computed(() => String(route.params.submissionId ?? ""));
const agencyId = computed(() =>
  typeof route.query.agencyId === "string" ? route.query.agencyId : (sharedAgencyId.value ?? ""),
);

const data = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const decideOpen = ref(false);

async function load() {
  if (!agencyId.value || !submissionId.value) {
    error.value = t("officer.review.notFound");
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    data.value = await api.officer.get({
      agencyId: agencyId.value,
      submissionId: submissionId.value,
    });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await ensureLoaded();
  await load();
});

const documents = computed(() => data.value?.documents ?? []);

const { user } = useAuth();

type ActivityEvent = {
  id?: string;
  action?: string | null;
  createdAt?: string | Date | null;
  data?: Record<string, unknown> | null;
};

const activity = computed<ActivityEvent[]>(() => data.value?.activity ?? []);

const company = computed(() => data.value?.company ?? null);

function companyName(): string {
  const value = company.value;
  if (!value) {
    return "";
  }
  return locale.value === "ar"
    ? value.legalNameAr || value.legalName || value.tradeName || ""
    : value.tradeName || value.legalName || "";
}

/**
 * The review payload does not always carry the assignment, so fall back to the
 * latest assignment event. Oldest-agnostic: compare timestamps instead of
 * trusting the API's ordering.
 */
const assignedUserId = computed<string | null>(() => {
  const events = activity.value.filter(
    (event) => event.action === "submission.assigned" || event.action === "submission.unassigned",
  );
  if (events.length === 0) {
    return null;
  }
  const latest = events.reduce((a, b) =>
    new Date(b.createdAt ?? 0).getTime() >= new Date(a.createdAt ?? 0).getTime() ? b : a,
  );
  const value = latest.data?.assigneeUserId;
  return typeof value === "string" && value.length > 0 ? value : null;
});

const plan = computed(() => {
  const submission = data.value?.submission ?? {};
  const assigneeUserId = submission.assigneeUserId ?? assignedUserId.value ?? null;
  const isMine =
    typeof submission.isMine === "boolean"
      ? submission.isMine
      : Boolean(assigneeUserId && assigneeUserId === user.value?.id);
  const assigneeName =
    submission.assigneeName ??
    (!isMine && assigneeUserId ? t("officerOps.assignment.anotherAgent") : null);
  return { assigneeUserId, assigneeName, isMine };
});

const reviewPayload = computed(() => {
  if (!data.value) {
    return {};
  }
  return {
    ...data.value,
    submission: {
      ...data.value.submission,
      assigneeUserId: plan.value.assigneeUserId,
      assigneeName: plan.value.assigneeName,
      isMine: plan.value.isMine,
    },
  };
});

const submission = computed(() => data.value?.submission ?? {});

const slaBucket = computed(() => submission.value.slaBucket ?? data.value?.slaBucket ?? "unknown");

const slaDays = computed(() => {
  const value = submission.value.ageDays ?? data.value?.ageDays;
  return typeof value === "number" ? value : null;
});

const slaDueAt = computed(() => submission.value.dueAt ?? data.value?.dueAt ?? null);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <LoadingState v-if="loading" :label="t('officer.common.loading')" />

    <UAlert
      v-else-if="error || !data"
      color="error"
      variant="subtle"
      :title="t('officer.review.notFound')"
      :description="error ?? undefined"
    />

    <template v-else>
      <!-- Single-line identity row: the sidebar already names the section. -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 pb-3">
        <h1 class="min-w-0 truncate text-base font-medium text-highlighted">
          {{ companyName() || t("officer.review.title") }}
        </h1>
        <span
          v-if="company?.uniqueIdentifier"
          dir="ltr"
          class="truncate font-mono text-sm text-muted"
        >
          {{ company.uniqueIdentifier }}
        </span>
        <SubmissionStatusBadge :status="submission.status" />
        <CleanlinessBadge :tier="submission.cleanlinessTier" :score="submission.cleanlinessScore" />
      </div>

      <!-- Two-pane split fills the viewport; the aside hairline spans its full height. -->
      <div
        class="grid min-h-0 flex-1 grid-cols-1 border-t border-default xl:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <div class="flex min-h-0 min-w-0 flex-col pt-4">
          <DocumentViewer class="xl:pe-5" :documents="documents" :agency-id="agencyId" />
        </div>

        <aside class="min-h-0 min-w-0 border-default xl:border-s">
          <div class="flex flex-col">
            <div class="flex flex-wrap items-center gap-2 pt-4 pb-3 xl:ps-5">
              <span class="text-sm text-muted">{{ t("officerOps.review.slaBanner") }} :</span>
              <SlaBadge :bucket="slaBucket" :days="slaDays" :due-at="slaDueAt" />
            </div>

            <AssignmentControls
              class="xl:ps-5"
              :agency-id="agencyId"
              :submission-id="submissionId"
              :assignee-user-id="plan.assigneeUserId"
              :assignee-name="plan.assigneeName"
              :is-mine="plan.isMine"
              @changed="load"
            />

            <div class="border-t border-default pt-4">
              <SubmissionReviewPanel :payload="reviewPayload" @decide="decideOpen = true" />
            </div>
          </div>
        </aside>
      </div>
    </template>

    <DecisionModal
      v-if="data"
      v-model:open="decideOpen"
      :submission-id="submissionId"
      :agency-id="agencyId"
      @decided="load"
    />
  </div>
</template>
