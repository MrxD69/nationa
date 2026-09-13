<script setup lang="ts">
type Totals = {
  submissions: number;
  byTier: { clean: number; minor_concern: number; needs_review: number };
  estimatedTimeSavedMinutes: number;
  caughtByChecks: number;
};

type Patterns = {
  commonFindings: Array<{ code: string; count: number }>;
  commonRejectionReasons: Array<{ reason: string; count: number }>;
};

const props = defineProps<{ totals: Totals; patterns: Patterns }>();

const { t, te } = useI18n();

const topFinding = computed(() => props.patterns.commonFindings[0] ?? null);
const topReason = computed(() => props.patterns.commonRejectionReasons[0] ?? null);

/**
 * Never surface the raw check `code` in a KPI: show the translated finding
 * title, or a neutral label when the code has no translation.
 */
function findingLabel(code: string): string {
  const key = `checks.findings.${code}.title`;
  return te(key) ? t(key) : t("officer.analytics.unknownFinding");
}

const cards = computed(() => [
  {
    key: "submissions",
    icon: "i-tabler-inbox",
    label: t("officer.analytics.kpi.submissions"),
    value: String(props.totals.submissions),
  },
  {
    key: "caught",
    icon: "i-tabler-shield-check",
    label: t("officer.analytics.kpi.caughtByChecks"),
    value: String(props.totals.caughtByChecks),
  },
  {
    key: "timeSaved",
    icon: "i-tabler-clock",
    label: t("officer.analytics.kpi.timeSaved"),
    value: t("officer.analytics.kpi.minutes", { count: props.totals.estimatedTimeSavedMinutes }),
  },
  {
    key: "findings",
    icon: "i-tabler-alert-triangle",
    label: t("officer.analytics.kpi.commonFindings"),
    value: topFinding.value
      ? `${findingLabel(topFinding.value.code)} (${topFinding.value.count})`
      : "—",
  },
  {
    key: "reasons",
    icon: "i-tabler-gavel",
    label: t("officer.analytics.kpi.commonReasons"),
    value: topReason.value ? `${topReason.value.reason} (${topReason.value.count})` : "—",
  },
]);
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <div
      v-for="card in cards"
      :key="card.key"
      class="rounded-lg border border-default bg-elevated/40 p-4"
    >
      <div class="flex items-start gap-3">
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-md bg-accented text-muted"
        >
          <UIcon :name="card.icon" class="size-5" />
        </span>
        <div class="min-w-0">
          <p class="text-sm text-muted">{{ card.label }}</p>
          <p class="mt-0.5 truncate text-lg font-semibold text-highlighted">{{ card.value }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
