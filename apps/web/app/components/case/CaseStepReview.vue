<script setup lang="ts">
import { FIELD_LABELS } from "@nationa/api/domain/fields";

import CaseFieldProvenance from "~/components/case/CaseFieldProvenance.vue";

type Provenance = Record<string, unknown>;

type ReviewField = {
  id: string;
  fieldKey: string;
  valueText?: string | null;
  valueJsonb?: unknown;
  sourceKind?: string;
  provenance?: Provenance[];
};

type Finding = {
  id: string;
  severity: string;
  code: string;
  title: string;
  messagePlain: string;
  suggestedFix?: string | null;
  status?: string;
};

const props = defineProps<{
  caseId: string;
  companyId?: string;
  fields: ReviewField[];
}>();

const { locale, t } = useI18n();
const api = useCase();

const findings = ref<Finding[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const severityColor: Record<string, "info" | "warning" | "error" | "neutral"> = {
  info: "info",
  warning: "warning",
  error: "error",
  blocker: "error",
};

function fieldLabel(key: string): string {
  const labels = FIELD_LABELS[key as keyof typeof FIELD_LABELS];
  if (!labels) {
    return key;
  }
  return locale.value === "ar" ? (labels.ar ?? labels.fr) : labels.fr;
}

function displayValue(field: ReviewField): string {
  if (field.valueText) {
    return field.valueText;
  }
  if (field.valueJsonb !== null && field.valueJsonb !== undefined) {
    return JSON.stringify(field.valueJsonb);
  }
  return "—";
}

async function loadFindings(): Promise<void> {
  loading.value = true;
  try {
    findings.value = (await api.listCaseFindings({
      caseId: props.caseId,
      companyId: props.companyId,
    })) as Finding[];
    error.value = null;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

async function runChecks(): Promise<void> {
  try {
    await api.runCaseChecks({ caseId: props.caseId, companyId: props.companyId });
    await loadFindings();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}

onMounted(loadFindings);
</script>

<template>
  <div class="grid gap-6">
    <div class="grid gap-2">
      <h3 class="text-sm font-medium text-highlighted">{{ t("cases.review.valuesTitle") }}</h3>
      <div
        v-for="field in props.fields"
        :key="field.id"
        class="grid gap-1 border-b border-default py-2 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4"
      >
        <div class="text-sm text-muted">{{ fieldLabel(field.fieldKey) }}</div>
        <div class="grid gap-1">
          <div class="text-sm text-highlighted">{{ displayValue(field) }}</div>
          <CaseFieldProvenance :provenance="field.provenance" />
        </div>
      </div>
      <UAlert
        v-if="props.fields.length === 0"
        color="neutral"
        variant="subtle"
        :title="t('cases.review.empty')"
      />
    </div>

    <div class="grid gap-3">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-medium text-highlighted">{{ t("cases.review.checksTitle") }}</h3>
        <UButton
          size="xs"
          color="neutral"
          variant="outline"
          icon="i-tabler-shield-check"
          :loading="loading"
          :label="t('cases.review.runChecks')"
          @click="runChecks"
        />
      </div>

      <UAlert v-if="error" color="error" variant="subtle" :title="error" />

      <div
        v-for="finding in findings"
        :key="finding.id"
        class="rounded-lg border border-default p-3"
      >
        <div class="flex items-center gap-2">
          <UBadge :color="severityColor[finding.severity] ?? 'neutral'" variant="subtle" size="sm">
            {{ t(`cases.review.severity.${finding.severity}`, finding.severity) }}
          </UBadge>
          <span class="text-sm font-medium text-highlighted">{{ finding.title }}</span>
        </div>
        <p class="mt-1 text-sm leading-6 text-muted">{{ finding.messagePlain }}</p>
        <p v-if="finding.suggestedFix" class="mt-1 text-xs text-muted">
          {{ t("cases.review.suggestedFix") }}: {{ finding.suggestedFix }}
        </p>
      </div>

      <UAlert
        v-if="!loading && findings.length === 0"
        color="success"
        variant="subtle"
        icon="i-tabler-square-rounded-check"
        :title="t('cases.review.noFindings')"
      />
    </div>
  </div>
</template>
