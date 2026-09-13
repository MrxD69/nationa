<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";
import SubmissionStatusBadge from "~/components/submission/SubmissionStatusBadge.vue";
import CleanlinessBadge from "~/components/submission/CleanlinessBadge.vue";

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
          size: "xs",
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
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-muted">{{ t("officer.queue.sort") }}</span>
      <UButton
        size="lg"
        :color="sort === 'cleanliness' ? 'primary' : 'neutral'"
        :variant="sort === 'cleanliness' ? 'solid' : 'ghost'"
        icon="i-tabler-shield-check"
        :label="t('officer.queue.sortCleanliness')"
        @click="emit('update:sort', 'cleanliness')"
      />
      <UButton
        size="lg"
        :color="sort === 'submittedAt' ? 'primary' : 'neutral'"
        :variant="sort === 'submittedAt' ? 'solid' : 'ghost'"
        icon="i-tabler-calendar"
        :label="t('officer.queue.sortSubmitted')"
        @click="emit('update:sort', 'submittedAt')"
      />
    </div>

    <UTable :data="rows" :columns="columns" :loading="loading" :empty="t('officer.queue.empty')" />
  </div>
</template>
