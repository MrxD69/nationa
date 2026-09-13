<script setup lang="ts">
import SubmissionStatusBadge from "./SubmissionStatusBadge.vue";
import CleanlinessBadge from "./CleanlinessBadge.vue";

type SubmissionCardData = {
  id: string;
  companyId: string;
  status: string;
  cleanlinessTier: string;
  cleanlinessScore?: string | number | null;
  submittedAt?: string | Date | null;
  company?: {
    legalName?: string | null;
    legalNameAr?: string | null;
    tradeName?: string | null;
  } | null;
  agency?: { nameFr?: string | null; nameAr?: string | null } | null;
};

const props = defineProps<{ submission: SubmissionCardData }>();

const { t, locale } = useI18n();

const companyName = computed(() => {
  const company = props.submission.company;
  if (!company) {
    return "";
  }
  return locale.value === "ar"
    ? company.legalNameAr || company.legalName || company.tradeName || ""
    : company.tradeName || company.legalName || "";
});

const agencyName = computed(() => {
  const agency = props.submission.agency;
  if (!agency) {
    return "";
  }
  return locale.value === "ar" ? agency.nameAr || agency.nameFr || "" : agency.nameFr || "";
});

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(locale.value);
}

const link = computed(() => ({
  path: `/submissions/${props.submission.id}`,
  query: { companyId: props.submission.companyId },
}));
</script>

<template>
  <NuxtLink
    :to="link"
    class="group flex items-center gap-4 rounded-lg border border-default p-5 transition-control hover-surface focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
  >
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 space-y-1">
          <p class="truncate text-base font-semibold text-highlighted">
            {{ companyName || t("submissions.title") }}
          </p>
          <p class="text-sm text-muted">
            <span v-if="agencyName">{{ agencyName }}</span>
            <span v-if="agencyName && formatDate(submission.submittedAt)"> · </span>
            <span v-if="formatDate(submission.submittedAt)">
              {{ t("submissions.list.submittedAt") }} {{ formatDate(submission.submittedAt) }}
            </span>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <CleanlinessBadge
            :tier="submission.cleanlinessTier"
            :score="submission.cleanlinessScore"
          />
          <SubmissionStatusBadge :status="submission.status" />
        </div>
      </div>
    </div>

    <UIcon name="i-tabler-chevron-right" class="size-5 shrink-0 text-muted rtl:rotate-180" />
  </NuxtLink>
</template>
