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
  <div v-if="ordered.length === 0" class="text-sm text-muted xl:ps-5">
    {{ t("officer.review.noFindings") }}
  </div>

  <ul v-else class="w-full divide-y divide-default">
    <li v-for="finding in ordered" :key="finding.id" class="py-2 xl:ps-5">
      <div class="flex flex-wrap items-center gap-2">
        <SeverityBadge :severity="finding.severity" />
        <UBadge color="neutral" variant="subtle" size="sm">
          {{ t(`checks.status.${finding.status}`, finding.status) }}
        </UBadge>
        <span class="min-w-0 text-sm font-medium text-highlighted">
          {{ translate(finding, "title") }}
        </span>
        <UButton
          v-if="finding.id"
          class="ms-auto"
          size="md"
          color="neutral"
          variant="ghost"
          icon="i-tabler-external-link"
          :to="`/findings/${finding.id}`"
          :title="t('officer.review.openFinding')"
          :label="t('officer.review.openFinding')"
        />
      </div>
      <p class="mt-1 truncate text-sm text-toned" :title="translate(finding, 'message')">
        {{ translate(finding, "message") }}
      </p>
      <p v-if="translate(finding, 'fix')" class="mt-1 text-sm text-muted">
        {{ t("checks.detail.suggestedFix") }} : {{ translate(finding, "fix") }}
      </p>
    </li>
  </ul>
</template>
