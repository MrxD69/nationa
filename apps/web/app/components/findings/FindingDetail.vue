<script setup lang="ts">
import ComparedValues from "./ComparedValues.vue";
import SeverityBadge from "./SeverityBadge.vue";

type ComparedRef = {
  kind: string;
  source: string;
  field?: string | null;
  labelKey?: string | null;
  ref?: string | null;
  documentVersionId?: string | null;
  value: string | null;
};

type Finding = {
  id: string;
  checkRunId: string;
  severity: "info" | "warning" | "error" | "blocker";
  code: string;
  title: string;
  messagePlain: string;
  suggestedFix: string | null;
  comparedRefs: unknown;
  status: "open" | "resolved" | "waived" | "acknowledged";
  createdAt: string | Date;
};

type ComparedRefsPayload = {
  refs?: ComparedRef[];
  params?: Record<string, string>;
};

const props = defineProps<{ finding: Finding }>();

const { t, te, locale } = useI18n();

const payload = computed<ComparedRefsPayload>(
  () => (props.finding.comparedRefs as ComparedRefsPayload | null) ?? {},
);

const refs = computed<ComparedRef[]>(() => payload.value.refs ?? []);

function translate(field: "title" | "message" | "fix"): string {
  const key = `checks.findings.${props.finding.code}.${field}`;
  if (te(key)) {
    return t(key, payload.value.params ?? {});
  }
  switch (field) {
    case "title":
      return props.finding.title;
    case "message":
      return props.finding.messagePlain;
    default:
      return props.finding.suggestedFix ?? "";
  }
}

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
</script>

<template>
  <article class="space-y-6">
    <header class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <SeverityBadge :severity="finding.severity" />
        <UBadge color="neutral" variant="outline" size="lg">
          {{ t(`checks.status.${finding.status}`) }}
        </UBadge>
        <UBadge color="neutral" variant="soft" size="lg">
          {{ t("checks.detail.code") }} : {{ finding.code }}
        </UBadge>
      </div>

      <h1 class="text-xl font-semibold tracking-tight text-highlighted">
        {{ translate("title") }}
      </h1>

      <p class="text-base leading-6 text-toned" dir="auto">{{ translate("message") }}</p>

      <p class="text-sm text-muted">
        {{ t("checks.detail.createdAt") }} : {{ formatDate(finding.createdAt) }}
      </p>
    </header>

    <UAlert
      v-if="translate('fix')"
      color="primary"
      variant="soft"
      icon="i-tabler-bulb"
      :title="t('checks.detail.suggestedFix')"
      :description="translate('fix')"
    />

    <ComparedValues :refs="refs" />
  </article>
</template>
