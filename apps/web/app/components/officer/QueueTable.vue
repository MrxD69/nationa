<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";
import SubmissionStatusBadge from "~/components/submission/SubmissionStatusBadge.vue";
import CleanlinessBadge from "~/components/submission/CleanlinessBadge.vue";
import SlaBadge from "~/components/officer/ui/SlaBadge.vue";
import AssignmentChip from "~/components/officer/ui/AssignmentChip.vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

type QueueItem = {
  id: string;
  caseId?: string | null;
  status: string;
  cleanlinessTier: string;
  cleanlinessScore?: string | number | null;
  submittedAt?: string | Date | null;
  createdAt?: string | Date | null;
  ageDays: number | null;
  ageHours?: number | null;
  dueAt?: string | Date | null;
  slaBucket: "on_time" | "at_risk" | "breached" | "unknown";
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  isMine?: boolean;
  deficiencyDueAt?: string | Date | null;
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

const props = withDefaults(
  defineProps<{
    items: QueueItem[];
    loading?: boolean;
    claimingId?: string | null;
  }>(),
  { loading: false, claimingId: null },
);

const emit = defineEmits<{
  open: [id: string];
  claim: [id: string];
}>();

const { t, locale } = useI18n();
const UButton = resolveComponent("UButton");

function companyName(item: QueueItem): string {
  const company = item.company;
  if (!company) {
    return "";
  }
  return locale.value === "ar"
    ? company.legalNameAr || company.legalName || company.tradeName || ""
    : company.tradeName || company.legalName || "";
}

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(locale.value);
}

function daysValue(item: QueueItem): number | null {
  if (typeof item.ageDays === "number") {
    return item.ageDays;
  }
  return null;
}

const rows = computed(() => props.items);

const columns = computed<TableColumn<QueueItem>[]>(() => [
  {
    accessorKey: "company",
    header: t("officerOps.queue.columns.company"),
    cell: ({ row }) =>
      h("div", { class: "min-w-0" }, [
        h(
          "p",
          { class: "truncate text-sm font-medium text-highlighted" },
          companyName(row.original) || "—",
        ),
        row.original.company?.uniqueIdentifier
          ? h(
              "p",
              { class: "truncate text-sm text-muted", dir: "ltr" },
              row.original.company.uniqueIdentifier,
            )
          : null,
      ]),
  },
  {
    accessorKey: "submittedAt",
    header: t("officerOps.queue.columns.submitted"),
    cell: ({ row }) =>
      h("span", { class: "text-sm text-muted" }, formatDate(row.original.submittedAt)),
  },
  {
    accessorKey: "slaBucket",
    header: t("officerOps.queue.columns.sla"),
    cell: ({ row }) =>
      h(SlaBadge, {
        bucket: row.original.slaBucket ?? "unknown",
        days: daysValue(row.original),
        dueAt: row.original.dueAt ?? null,
      }),
  },
  {
    accessorKey: "cleanlinessTier",
    header: t("officerOps.queue.columns.cleanliness"),
    cell: ({ row }) =>
      h(CleanlinessBadge, {
        tier: row.original.cleanlinessTier,
        score: row.original.cleanlinessScore,
      }),
  },
  {
    accessorKey: "findingsCount",
    header: t("officerOps.queue.columns.findings"),
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-1.5" }, [
        h("span", { class: "text-sm font-medium" }, String(row.original.findingsCount)),
        row.original.blockers > 0
          ? h("span", { class: "text-sm font-medium text-error" }, `+${row.original.blockers}`)
          : null,
      ]),
  },
  {
    accessorKey: "status",
    header: t("officerOps.queue.columns.status"),
    cell: ({ row }) => h(SubmissionStatusBadge, { status: row.original.status }),
  },
  {
    accessorKey: "assigneeName",
    header: t("officerOps.queue.columns.assignment"),
    cell: ({ row }) =>
      h(AssignmentChip, {
        name: row.original.assigneeName,
        isMine: row.original.isMine,
      }),
  },
  {
    id: "actions",
    header: t("officerOps.queue.columns.actions"),
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-2" }, [
        !row.original.assigneeUserId
          ? h(
              UButton,
              {
                size: "md",
                color: "primary",
                variant: "soft",
                icon: "i-tabler-hand-grab",
                loading: props.claimingId === row.original.id,
                disabled: props.claimingId !== null,
                onClick: () => emit("claim", row.original.id),
              },
              () => t("officerOps.queue.take"),
            )
          : null,
        h(
          UButton,
          {
            size: "md",
            color: "neutral",
            variant: "solid",
            icon: "i-tabler-eye",
            onClick: () => emit("open", row.original.id),
          },
          () => t("officerOps.queue.examine"),
        ),
      ]),
  },
]);
</script>

<template>
  <div class="space-y-4">
    <LoadingState
      v-if="loading && items.length === 0"
      variant="skeleton-rows"
      :count="5"
      :label="t('officerOps.common.loading')"
    />

    <EmptyState
      v-else-if="items.length === 0"
      icon="i-tabler-inbox"
      :title="t('officerOps.queue.empty')"
      :description="t('officerOps.queue.emptyDescription')"
    />

    <template v-else>
      <!-- Desktop: full table, scrolls horizontally rather than clipping columns. -->
      <div class="hidden overflow-x-auto md:block">
        <UTable
          :data="rows"
          :columns="columns"
          :loading="loading"
          :empty="t('officerOps.queue.empty')"
          :ui="{
            base: 'w-full min-w-[52rem]',
            th: 'border-0 px-4 py-2 text-sm',
            td: 'border-0 px-4 py-2 text-sm',
          }"
        />
      </div>

      <!-- Mobile: one dense row per submission, hairline separated. -->
      <ul
        class="divide-y divide-default border-y border-default md:hidden"
        :aria-label="t('officerOps.queue.mobileList')"
      >
        <li v-for="item in rows" :key="item.id" class="space-y-3 py-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-base font-medium text-highlighted">
                {{ companyName(item) || "—" }}
              </p>
              <p
                v-if="item.company?.uniqueIdentifier"
                dir="ltr"
                class="truncate text-sm text-muted"
              >
                {{ item.company.uniqueIdentifier }}
              </p>
            </div>
            <SubmissionStatusBadge :status="item.status" />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <SlaBadge
              :bucket="item.slaBucket ?? 'unknown'"
              :days="daysValue(item)"
              :due-at="item.dueAt ?? null"
            />
            <CleanlinessBadge :tier="item.cleanlinessTier" :score="item.cleanlinessScore" />
            <UBadge color="neutral" variant="soft">
              {{ t("officerOps.queue.findingsCount", { count: item.findingsCount }) }}
            </UBadge>
            <UBadge v-if="item.blockers > 0" color="error" variant="subtle">
              {{ t("officerOps.queue.blockers", { count: item.blockers }) }}
            </UBadge>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm text-muted">{{ formatDate(item.submittedAt) }}</span>
            <AssignmentChip :name="item.assigneeName" :is-mine="item.isMine" />
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <UButton
              v-if="!item.assigneeUserId"
              size="md"
              color="primary"
              variant="soft"
              icon="i-tabler-hand-grab"
              block
              class="sm:w-auto"
              :loading="claimingId === item.id"
              :disabled="claimingId !== null"
              :label="t('officerOps.queue.take')"
              @click="emit('claim', item.id)"
            />
            <UButton
              v-else-if="item.isMine"
              size="md"
              color="primary"
              variant="soft"
              icon="i-tabler-hand-grab"
              block
              class="sm:w-auto"
              :label="t('officerOps.queue.take')"
              @click="emit('open', item.id)"
            />
            <UButton
              size="md"
              color="neutral"
              variant="solid"
              icon="i-tabler-eye"
              block
              class="sm:w-auto"
              :label="t('officerOps.queue.examine')"
              @click="emit('open', item.id)"
            />
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>
