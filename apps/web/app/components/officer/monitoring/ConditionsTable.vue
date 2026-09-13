<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";
import OfficerDataRow from "~/components/officer/ui/OfficerDataRow.vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

type Bucket = "overdue" | "due_soon" | "upcoming" | "unknown";

type ConditionItem = {
  companyId: string;
  companyName: string;
  companyNameAr: string | null;
  uniqueIdentifier: string | null;
  companyLegalForm: string | null;
  obligationId: string;
  obligationCode: string;
  obligationNameFr: string;
  obligationNameAr: string | null;
  periodicity: string;
  agencyId: string;
  dueDate: string | null;
  daysRemaining: number | null;
  bucket: Bucket;
  penaltySummary: string | null;
  legalBasis: string | null;
  registryState: string | null;
  fiscalDefault: boolean | string | null;
  lastFinancialStatementsDate: string | null;
  companyRegistryType: string | null;
};

const props = withDefaults(defineProps<{ items: ConditionItem[]; loading?: boolean }>(), {
  loading: false,
});

const { t, te, locale } = useI18n();
const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");

const expanded = ref<Record<string, boolean>>({});

const tableUi = {
  base: "w-full min-w-[56rem]",
  tbody: "divide-y-0",
  th: "border-0 px-4 py-2 whitespace-nowrap",
  td: "border-0 px-4 py-2 whitespace-normal",
  tr: "border-b border-default",
};

function localized(fr: string | null, ar: string | null): string {
  return locale.value === "ar" ? ar || fr || "—" : fr || ar || "—";
}

function companyName(item: ConditionItem): string {
  return localized(item.companyName, item.companyNameAr);
}

function obligationName(item: ConditionItem): string {
  return localized(item.obligationNameFr, item.obligationNameAr);
}

function label(key: string, fallback: string | null): string {
  return te(key) ? t(key) : (fallback ?? "—");
}

function periodicityLabel(value: string): string {
  return label(`officerMonitoring.conditions.periodicityLabels.${value}`, value);
}

function bucketLabel(value: string): string {
  return label(`officerMonitoring.conditions.buckets.${value}`, value);
}

function bucketColor(value: Bucket): "error" | "warning" | "neutral" {
  if (value === "overdue") {
    return "error";
  }
  return value === "due_soon" ? "warning" : "neutral";
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(locale.value);
}

function daysLabel(item: ConditionItem): string {
  if (typeof item.daysRemaining !== "number") {
    return "—";
  }
  const key =
    item.daysRemaining >= 0
      ? "officerMonitoring.conditions.days.remaining"
      : "officerMonitoring.conditions.days.late";
  if (te(key)) {
    return t(key, { count: Math.abs(item.daysRemaining) });
  }
  return item.daysRemaining >= 0
    ? `dans ${item.daysRemaining} j`
    : `retard de ${Math.abs(item.daysRemaining)} j`;
}

function fiscalDefaultLabel(value: boolean | string | null): string | null {
  if (value === "months_12_24") {
    return t("officerMonitoring.conditions.fiscalDefault12");
  }
  if (value === "over_24_months") {
    return t("officerMonitoring.conditions.fiscalDefault24");
  }
  return null;
}

function registryStateLabel(value: string): string {
  const key = `officerMonitoring.conditions.registryStateValues.${value}`;
  return te(key) ? t(key) : value;
}

const columns = computed<TableColumn<ConditionItem>[]>(() => [
  {
    accessorKey: "companyName",
    header: t("officerMonitoring.conditions.columns.company"),
    cell: ({ row }) =>
      h("div", { class: "max-w-[14rem] min-w-0" }, [
        h(
          "p",
          {
            class: "truncate text-sm font-medium text-highlighted",
            title: companyName(row.original),
          },
          companyName(row.original),
        ),
        h(
          "p",
          { class: "text-xs text-muted tabular", dir: "ltr" },
          row.original.uniqueIdentifier || "—",
        ),
      ]),
  },
  {
    accessorKey: "obligationNameFr",
    header: t("officerMonitoring.conditions.columns.obligation"),
    cell: ({ row }) =>
      h(
        "p",
        {
          class: "max-w-[16rem] truncate text-sm text-highlighted",
          title: obligationName(row.original),
        },
        obligationName(row.original),
      ),
  },
  {
    accessorKey: "periodicity",
    header: t("officerMonitoring.conditions.columns.periodicity"),
    cell: ({ row }) =>
      h(UBadge, { color: "neutral", variant: "soft" }, () =>
        periodicityLabel(row.original.periodicity),
      ),
  },
  {
    accessorKey: "dueDate",
    header: t("officerMonitoring.conditions.columns.dueDate"),
    cell: ({ row }) =>
      h("div", { class: "flex flex-col items-start gap-1" }, [
        h("span", { class: "text-sm text-highlighted" }, formatDate(row.original.dueDate)),
        h(UBadge, { color: bucketColor(row.original.bucket), variant: "subtle" }, () =>
          bucketLabel(row.original.bucket),
        ),
      ]),
  },
  {
    id: "remaining",
    header: t("officerMonitoring.conditions.columns.remaining"),
    cell: ({ row }) =>
      h("span", { class: "text-sm font-medium text-highlighted" }, daysLabel(row.original)),
  },
  {
    id: "regime",
    header: t("officerMonitoring.conditions.columns.regime"),
    cell: ({ row }) =>
      h("div", { class: "flex flex-wrap gap-1" }, [
        row.original.registryState
          ? h(UBadge, { color: "neutral", variant: "subtle" }, () =>
              registryStateLabel(row.original.registryState as string),
            )
          : null,
        fiscalDefaultLabel(row.original.fiscalDefault)
          ? h(
              UBadge,
              { color: "error", variant: "subtle" },
              () => fiscalDefaultLabel(row.original.fiscalDefault) as string,
            )
          : null,
      ]),
  },
  {
    id: "details",
    header: () => t("officerMonitoring.conditions.columns.details"),
    cell: ({ row }) =>
      h(
        UButton,
        {
          size: "md",
          color: "neutral",
          variant: "soft",
          icon: row.getIsExpanded() ? "i-tabler-chevron-up" : "i-tabler-chevron-down",
          label: row.getIsExpanded()
            ? t("officerMonitoring.conditions.collapse")
            : t("officerMonitoring.conditions.expand"),
          onClick: () => row.toggleExpanded(),
        },
        () =>
          row.getIsExpanded()
            ? t("officerMonitoring.conditions.collapse")
            : t("officerMonitoring.conditions.expand"),
      ),
  },
]);
</script>

<template>
  <div class="space-y-3">
    <LoadingState
      v-if="loading && items.length === 0"
      variant="skeleton-rows"
      :count="6"
      :label="t('officerMonitoring.common.loading')"
    />

    <EmptyState
      v-else-if="items.length === 0"
      icon="i-tabler-calendar-check"
      :title="t('officerMonitoring.conditions.empty')"
      :description="t('officerMonitoring.conditions.emptyDescription')"
    />

    <template v-else>
      <div class="hidden overflow-x-auto md:block">
        <UTable
          v-model:expanded="expanded"
          :data="items"
          :columns="columns"
          :loading="loading"
          :ui="tableUi"
          :expanded-options="{ getRowCanExpand: () => true }"
          :empty="t('officerMonitoring.conditions.empty')"
        >
          <template #expanded="{ row }">
            <div class="space-y-3 px-4 py-4">
              <div>
                <p class="text-sm font-medium text-muted">
                  {{ t("officerMonitoring.conditions.penalty") }}
                </p>
                <p class="text-sm text-highlighted">
                  {{ row.original.penaltySummary || t("officerMonitoring.conditions.penaltyNone") }}
                </p>
              </div>

              <div class="grid gap-x-8 md:grid-cols-2">
                <OfficerDataRow
                  :label="t('officerMonitoring.conditions.fields.uniqueIdentifier')"
                  :value="row.original.uniqueIdentifier"
                  mono
                />
                <OfficerDataRow
                  :label="t('officerMonitoring.conditions.fields.legalForm')"
                  :value="row.original.companyLegalForm"
                />
                <OfficerDataRow
                  :label="t('officerMonitoring.conditions.fields.obligationCode')"
                  :value="row.original.obligationCode"
                  mono
                />
                <OfficerDataRow
                  :label="t('officerMonitoring.conditions.fields.registryType')"
                  :value="row.original.companyRegistryType"
                />
                <OfficerDataRow
                  :label="t('officerMonitoring.conditions.fields.registryState')"
                  :value="
                    row.original.registryState
                      ? registryStateLabel(row.original.registryState)
                      : null
                  "
                />
                <OfficerDataRow
                  :label="t('officerMonitoring.conditions.fields.lastStatements')"
                  :value="formatDate(row.original.lastFinancialStatementsDate)"
                />
                <OfficerDataRow
                  :label="t('officerMonitoring.conditions.fields.legalBasis')"
                  :value="row.original.legalBasis"
                />
              </div>
            </div>
          </template>
        </UTable>
      </div>

      <section
        class="divide-y divide-default md:hidden"
        :aria-label="t('officerMonitoring.conditions.title')"
      >
        <article
          v-for="item in items"
          :key="`${item.companyId}-${item.obligationId}`"
          class="space-y-2 py-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-highlighted">{{ companyName(item) }}</p>
              <p class="text-xs text-muted tabular" dir="ltr">
                {{ item.uniqueIdentifier || "—" }}
              </p>
            </div>
            <UBadge :color="bucketColor(item.bucket)" variant="subtle">
              {{ bucketLabel(item.bucket) }}
            </UBadge>
          </div>

          <p class="text-sm text-highlighted">{{ obligationName(item) }}</p>

          <div class="flex flex-wrap items-center gap-1.5">
            <UBadge color="neutral" variant="soft">
              {{ periodicityLabel(item.periodicity) }}
            </UBadge>
            <UBadge v-if="item.registryState" color="neutral" variant="subtle">
              {{ registryStateLabel(item.registryState) }}
            </UBadge>
            <UBadge v-if="fiscalDefaultLabel(item.fiscalDefault)" color="error" variant="subtle">
              {{ fiscalDefaultLabel(item.fiscalDefault) }}
            </UBadge>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-muted">
              {{ t("officerMonitoring.conditions.columns.dueDate") }}:
              {{ formatDate(item.dueDate) }}
            </span>
            <span class="text-sm font-semibold text-highlighted">{{ daysLabel(item) }}</span>
          </div>

          <div class="space-y-1">
            <p class="text-sm font-medium text-muted">
              {{ t("officerMonitoring.conditions.penalty") }}
            </p>
            <p class="text-sm text-highlighted">
              {{ item.penaltySummary || t("officerMonitoring.conditions.penaltyNone") }}
            </p>
          </div>

          <div class="space-y-1">
            <OfficerDataRow
              :label="t('officerMonitoring.conditions.fields.legalForm')"
              :value="item.companyLegalForm"
            />
            <OfficerDataRow
              :label="t('officerMonitoring.conditions.fields.obligationCode')"
              :value="item.obligationCode"
              mono
            />
            <OfficerDataRow
              :label="t('officerMonitoring.conditions.fields.legalBasis')"
              :value="item.legalBasis"
            />
            <OfficerDataRow
              :label="t('officerMonitoring.conditions.fields.registryType')"
              :value="item.companyRegistryType"
            />
            <OfficerDataRow
              :label="t('officerMonitoring.conditions.fields.lastStatements')"
              :value="formatDate(item.lastFinancialStatementsDate)"
            />
          </div>
        </article>
      </section>
    </template>
  </div>
</template>
