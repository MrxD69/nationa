<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

type PerformanceRow = {
  userId: string;
  name: string | null;
  decided: number;
  avgHours: number;
};

const props = withDefaults(defineProps<{ rows: PerformanceRow[]; loading?: boolean }>(), {
  loading: false,
});

const { t, locale } = useI18n();
const UProgress = resolveComponent("UProgress");

function formatHours(value: number): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }
  const number = value.toLocaleString(locale.value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return value < 48 ? `${number} h` : `${number} j`;
}

function relative(value: number): number {
  const max = Math.max(...props.rows.map((row) => row.decided), 1);
  return Math.round((value / max) * 100);
}

function nameOf(row: PerformanceRow): string {
  return row.name || "—";
}

const tableUi = {
  base: "w-full min-w-[36rem]",
  tbody: "divide-y-0",
  th: "border-0 px-4 py-2 whitespace-nowrap",
  td: "border-0 px-4 py-2",
  tr: "border-b border-default",
};

const columns = computed<TableColumn<PerformanceRow>[]>(() => [
  {
    accessorKey: "name",
    header: t("officerMonitoring.analytics.team.officer"),
    cell: ({ row }) =>
      h("span", { class: "text-sm font-medium text-highlighted" }, nameOf(row.original)),
  },
  {
    accessorKey: "decided",
    header: t("officerMonitoring.analytics.team.decisions"),
    cell: ({ row }) =>
      h("div", { class: "min-w-32 space-y-1.5" }, [
        h("span", { class: "text-sm font-medium text-highlighted" }, String(row.original.decided)),
        h(UProgress, {
          modelValue: relative(row.original.decided),
          size: "sm",
          "aria-label": t("officerMonitoring.analytics.team.relative"),
        }),
      ]),
  },
  {
    accessorKey: "avgHours",
    header: t("officerMonitoring.analytics.team.avgDelay"),
    cell: ({ row }) =>
      h("span", { class: "text-sm text-highlighted" }, formatHours(row.original.avgHours)),
  },
]);
</script>

<template>
  <div class="space-y-4">
    <LoadingState
      v-if="loading && rows.length === 0"
      variant="skeleton-rows"
      :count="4"
      :label="t('officerMonitoring.common.loading')"
    />

    <EmptyState
      v-else-if="rows.length === 0"
      icon="i-tabler-users"
      :title="t('officerMonitoring.analytics.team.empty')"
      :description="t('officerMonitoring.analytics.team.description')"
    />

    <template v-else>
      <div class="hidden overflow-x-auto md:block">
        <UTable :data="rows" :columns="columns" :loading="loading" :ui="tableUi" />
      </div>

      <section
        class="divide-y divide-default md:hidden"
        :aria-label="t('officerMonitoring.analytics.team.officer')"
      >
        <article v-for="row in rows" :key="row.userId" class="space-y-2 py-4">
          <p class="text-sm font-medium text-highlighted">{{ nameOf(row) }}</p>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-muted">
                {{ t("officerMonitoring.analytics.team.decisions") }}
              </span>
              <span class="text-sm font-medium text-highlighted">{{ row.decided }}</span>
            </div>
            <UProgress
              :model-value="relative(row.decided)"
              size="sm"
              :aria-label="t('officerMonitoring.analytics.team.relative')"
            />
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-muted">
              {{ t("officerMonitoring.analytics.team.avgDelay") }}
            </span>
            <span class="text-sm font-medium text-highlighted">{{
              formatHours(row.avgHours)
            }}</span>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>
