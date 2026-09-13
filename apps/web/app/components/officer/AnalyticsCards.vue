<script setup lang="ts">
import OfficerStatStrip from "~/components/officer/ui/OfficerStatStrip.vue";

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

const props = withDefaults(
  defineProps<{
    totals: Totals;
    patterns: Patterns;
    title?: string;
    description?: string;
  }>(),
  { title: "", description: "" },
);

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
    label: t("officer.analytics.kpi.submissions"),
    value: String(props.totals.submissions),
  },
  {
    key: "caught",
    label: t("officer.analytics.kpi.caughtByChecks"),
    value: String(props.totals.caughtByChecks),
  },
  {
    key: "timeSaved",
    label: t("officer.analytics.kpi.timeSaved"),
    value: t("officer.analytics.kpi.minutes", { count: props.totals.estimatedTimeSavedMinutes }),
  },
  {
    key: "findings",
    label: t("officer.analytics.kpi.commonFindings"),
    value: topFinding.value ? String(topFinding.value.count) : "—",
    hint: topFinding.value ? findingLabel(topFinding.value.code) : null,
  },
  {
    key: "reasons",
    label: t("officer.analytics.kpi.commonReasons"),
    value: topReason.value ? String(topReason.value.count) : "—",
    hint: topReason.value ? topReason.value.reason : null,
  },
]);
</script>

<template>
  <div class="space-y-2">
    <h2 v-if="title" class="text-sm font-semibold uppercase tracking-wide text-muted">
      {{ title }}
    </h2>

    <OfficerStatStrip :items="cards" />
  </div>
</template>
