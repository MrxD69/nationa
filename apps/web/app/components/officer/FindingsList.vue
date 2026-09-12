<script setup lang="ts">
import SeverityBadge from "~/components/findings/SeverityBadge.vue";

type Finding = {
  id: string;
  severity: "info" | "warning" | "error" | "blocker";
  code: string;
  title: string;
  messagePlain: string;
  suggestedFix?: string | null;
  comparedRefs?: unknown;
  status: string;
};

const props = defineProps<{ findings: Finding[] }>();

const { t, te } = useI18n();

const ORDER: Finding["severity"][] = ["blocker", "error", "warning", "info"];

const ordered = computed(() =>
  [...props.findings].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity)),
);

function params(finding: Finding): Record<string, string> {
  const payload = finding.comparedRefs as { params?: Record<string, string> } | null;
  return payload?.params ?? {};
}

function translate(finding: Finding, field: "title" | "message" | "fix"): string {
  const key = `checks.findings.${finding.code}.${field}`;
  if (te(key)) {
    return t(key, params(finding));
  }
  switch (field) {
    case "title":
      return finding.title;
    case "message":
      return finding.messagePlain;
    default:
      return finding.suggestedFix ?? "";
  }
}
</script>

<template>
  <div v-if="ordered.length === 0" class="text-sm text-muted">
    {{ t("officer.review.noFindings") }}
  </div>

  <div v-else class="space-y-3">
    <article
      v-for="finding in ordered"
      :key="finding.id"
      class="rounded-lg border border-default p-3"
    >
      <div class="flex flex-wrap items-center gap-2">
        <SeverityBadge :severity="finding.severity" />
        <span class="text-xs text-muted">{{
          t(`checks.status.${finding.status}`, finding.status)
        }}</span>
      </div>
      <h3 class="mt-2 text-sm font-semibold text-highlighted">{{ translate(finding, "title") }}</h3>
      <p class="mt-1 text-sm text-toned">{{ translate(finding, "message") }}</p>
      <p v-if="translate(finding, 'fix')" class="mt-2 text-xs text-muted">
        {{ t("checks.detail.suggestedFix") }} : {{ translate(finding, "fix") }}
      </p>
    </article>
  </div>
</template>
