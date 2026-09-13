<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";
import SubmissionStatusBadge from "~/components/submission/SubmissionStatusBadge.vue";
import CleanlinessBadge from "~/components/submission/CleanlinessBadge.vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

type QueueItem = {
  id: string;
  status: string;
  cleanlinessTier: string;
  cleanlinessScore?: string | number | null;
  submittedAt?: string | Date | null;
  ageDays: number | null;
  findingsCount: number;
  blockers: number;
  company?: {
    legalName?: string | null;
    legalNameAr?: string | null;
    tradeName?: string | null;
  } | null;
};

const props = withDefaults(
  defineProps<{ items: QueueItem[]; loading?: boolean; sort?: "cleanliness" | "submittedAt" }>(),
  { loading: false, sort: "cleanliness" },
);

const emit = defineEmits<{
  open: [id: string];
  "update:sort": [value: "cleanliness" | "submittedAt"];
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

const rows = computed(() => props.items);

const columns = computed<TableColumn<QueueItem>[]>(() => [
  {
    accessorKey: "company",
    header: t("officer.queue.company"),
    cell: ({ row }) =>
      h("span", { class: "text-base font-medium text-highlighted" }, companyName(row.original)),
  },
  {
    accessorKey: "submittedAt",
    header: t("officer.queue.submitted"),
    cell: ({ row }) =>
      h("span", { class: "text-base text-muted" }, formatDate(row.original.submittedAt)),
  },
  {
    accessorKey: "cleanlinessTier",
    header: t("officer.queue.cleanliness"),
    cell: ({ row }) =>
      h(CleanlinessBadge, {
        tier: row.original.cleanlinessTier,
        score: row.original.cleanlinessScore,
      }),
  },
  {
    accessorKey: "findingsCount",
    header: t("officer.queue.findings"),
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-1.5" }, [
        h("span", { class: "text-base font-medium" }, String(row.original.findingsCount)),
        row.original.blockers > 0
          ? h("span", { class: "text-sm text-error" }, `(${row.original.blockers})`)
          : null,
      ]),
  },
  {
    accessorKey: "status",
    header: t("officer.queue.status"),
    cell: ({ row }) => h(SubmissionStatusBadge, { status: row.original.status }),
  },
  {
    accessorKey: "ageDays",
    header: t("officer.queue.age"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-base text-muted" },
        row.original.ageDays === null
          ? "—"
          : t("officer.queue.ageDays", { count: row.original.ageDays }),
      ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) =>
      h(
        UButton,
        {
          variant: "soft",
          color: "neutral",
          label: t("officer.queue.open"),
          onClick: () => emit("open", row.original.id),
        },
        () => t("officer.queue.open"),
      ),
  },
]);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-base font-medium text-muted">{{ t("officer.queue.sort") }}</span>
      <UButton
        :color="sort === 'cleanliness' ? 'primary' : 'neutral'"
        :variant="sort === 'cleanliness' ? 'solid' : 'ghost'"
        icon="i-tabler-shield-check"
        :label="t('officer.queue.sortCleanliness')"
        @click="emit('update:sort', 'cleanliness')"
      />
      <UButton
        :color="sort === 'submittedAt' ? 'primary' : 'neutral'"
        :variant="sort === 'submittedAt' ? 'solid' : 'ghost'"
        icon="i-tabler-calendar"
        :label="t('officer.queue.sortSubmitted')"
        @click="emit('update:sort', 'submittedAt')"
      />
    </div>

    <LoadingState
      v-if="loading && items.length === 0"
      variant="skeleton-rows"
      :count="5"
      :label="t('officer.common.loading')"
    />

    <EmptyState
      v-else-if="items.length === 0"
      icon="i-tabler-inbox"
      :title="t('officer.queue.empty')"
      :description="t('officer.queue.emptyDescription')"
    />

    <template v-else>
      <!-- Desktop: full table. -->
      <div class="hidden md:block">
        <UTable
          :data="rows"
          :columns="columns"
          :loading="loading"
          :empty="t('officer.queue.empty')"
        />
      </div>

      <!-- Mobile: one card per submission; the table's seven columns do not fit. -->
      <section class="space-y-3 md:hidden" :aria-label="t('officer.queue.mobileList')">
        <article
          v-for="item in rows"
          :key="item.id"
          class="space-y-3 rounded-lg border border-default p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="min-w-0 truncate text-base font-medium text-highlighted">
              {{ companyName(item) || "—" }}
            </p>
            <SubmissionStatusBadge :status="item.status" />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <CleanlinessBadge :tier="item.cleanlinessTier" :score="item.cleanlinessScore" />
            <UBadge color="neutral" variant="soft">
              {{ t("officer.queue.findings") }}: {{ item.findingsCount }}
            </UBadge>
            <UBadge v-if="item.blockers > 0" color="error" variant="subtle">
              {{ t("officer.review.blockers") }}: {{ item.blockers }}
            </UBadge>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-muted">{{ formatDate(item.submittedAt) }}</span>
            <UButton
              variant="soft"
              color="neutral"
              icon="i-tabler-eye"
              :label="t('officer.queue.open')"
              @click="emit('open', item.id)"
            />
          </div>
        </article>
      </section>
    </template>
  </div>
</template>
