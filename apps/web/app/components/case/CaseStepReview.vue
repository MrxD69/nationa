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
const running = ref(false);
const hasRun = ref(false);
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

function humanize(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => humanize(item)).filter((item) => item !== "—");
    return parts.length ? parts.join(", ") : "—";
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("fr" in record || "ar" in record || "raw" in record) {
      const address = formatAddressLines(record).join(" · ");
      if (address) {
        return address;
      }
    }
    const entries = Object.entries(record)
      .filter(([, item]) => item !== null && item !== undefined && item !== "")
      .map(([key, item]) => `${fieldLabel(key)} : ${humanize(item)}`);
    return entries.length ? entries.join(" · ") : "—";
  }
  return "—";
}

function formatAddressLines(value: Record<string, unknown>): string[] {
  const chunks: string[] = [];
  for (const part of ["fr", "ar"] as const) {
    const localeParts = value[part];
    if (localeParts && typeof localeParts === "object") {
      const joined = Object.values(localeParts as Record<string, unknown>)
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .join(", ");
      if (joined) {
        chunks.push(joined);
      }
    }
  }
  if (typeof value.raw === "string" && value.raw.trim()) {
    chunks.push(value.raw.trim());
  }
  return chunks;
}

function displayLines(field: ReviewField): string[] {
  if (field.valueText) {
    return [field.valueText];
  }
  const value = field.valueJsonb;
  if (value === null || value === undefined || value === "") {
    return ["—"];
  }
  if (typeof value === "string") {
    return [value];
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => humanize(item)).filter((item) => item !== "—");
    return parts.length ? parts : ["—"];
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("fr" in record || "ar" in record || "raw" in record) {
      const lines = formatAddressLines(record);
      if (lines.length) {
        return lines;
      }
    }
    const entries = Object.entries(record)
      .filter(([, item]) => item !== null && item !== undefined && item !== "")
      .map(([key, item]) => `${fieldLabel(key)} : ${humanize(item)}`);
    return entries.length ? entries : ["—"];
  }
  return ["—"];
}

const GROUP_ORDER = ["blocker", "error", "warning", "info"] as const;

const groupIcons: Record<string, string> = {
  blocker: "i-tabler-octagon-minus",
  error: "i-tabler-octagon-minus",
  warning: "i-tabler-alert-triangle",
  info: "i-tabler-info-circle",
};

const groupedFindings = computed<{ bucket: string; items: Finding[] }[]>(() => {
  const buckets = new Map<string, Finding[]>();
  for (const finding of findings.value) {
    const bucket = GROUP_ORDER.includes(finding.severity as (typeof GROUP_ORDER)[number])
      ? finding.severity
      : "info";
    if (!buckets.has(bucket)) {
      buckets.set(bucket, []);
    }
    buckets.get(bucket)!.push(finding);
  }
  return GROUP_ORDER.filter((bucket) => (buckets.get(bucket)?.length ?? 0) > 0).map((bucket) => ({
    bucket,
    items: buckets.get(bucket)!,
  }));
});

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
  running.value = true;
  error.value = null;
  try {
    await api.runCaseChecks({ caseId: props.caseId, companyId: props.companyId });
    hasRun.value = true;
    await loadFindings();
  } catch {
    error.value = t("cases.review.failed");
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <div class="grid gap-6">
    <div class="grid gap-2">
      <h3 class="text-base font-medium text-highlighted">{{ t("cases.review.valuesTitle") }}</h3>
      <div
        v-for="field in props.fields"
        :key="field.id"
        class="grid gap-1 border-b border-default py-2 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4"
      >
        <div class="text-base text-muted">{{ fieldLabel(field.fieldKey) }}</div>
        <div class="grid gap-1">
          <ul class="grid gap-1">
            <li
              v-for="(line, index) in displayLines(field)"
              :key="index"
              class="text-base leading-6 break-words text-highlighted"
            >
              {{ line }}
            </li>
          </ul>
          <CaseFieldProvenance :provenance="field.provenance" />
        </div>
      </div>
      <UAlert
        v-if="props.fields.length === 0"
        color="neutral"
        variant="subtle"
        icon="i-tabler-inbox"
        :title="t('cases.review.empty')"
        :description="t('cases.review.emptyHint')"
      />
    </div>

    <div class="grid gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <div class="grid gap-0.5">
          <h3 class="text-base font-medium text-highlighted">
            {{ t("cases.review.checksTitle") }}
          </h3>
          <p class="text-sm text-muted">{{ t("cases.review.checksSubtitle") }}</p>
        </div>
        <div class="ms-auto flex flex-wrap items-center gap-2">
          <UBadge v-if="hasRun && findings.length > 0" color="neutral" variant="soft" size="lg">
            {{ t("cases.review.findingsCount", { count: findings.length }) }}
          </UBadge>
          <UButton
            color="primary"
            variant="solid"
            size="lg"
            icon="i-tabler-shield-check"
            class="press min-h-11"
            :loading="running"
            :label="hasRun ? t('cases.review.rerun') : t('cases.review.runChecks')"
            @click="runChecks"
          />
        </div>
      </div>

      <UAlert v-if="error" color="error" variant="subtle" :title="error" />

      <UAlert
        v-if="!hasRun && !running"
        color="neutral"
        variant="subtle"
        icon="i-tabler-info-circle"
        :title="t('cases.review.notRun')"
      />
      <UAlert
        v-else-if="running"
        color="info"
        variant="subtle"
        icon="i-tabler-loader-2"
        :title="t('cases.review.running')"
      />

      <div v-if="hasRun && !running" class="grid gap-4">
        <div v-for="group in groupedFindings" :key="group.bucket" class="grid gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <UIcon
              :name="groupIcons[group.bucket] ?? 'i-tabler-info-circle'"
              class="size-4 shrink-0 text-muted"
            />
            <span class="text-sm font-semibold text-highlighted">{{
              t(`cases.review.group.${group.bucket}`, group.bucket)
            }}</span>
            <UBadge color="neutral" variant="soft" size="md">{{ group.items.length }}</UBadge>
          </div>

          <div
            v-for="finding in group.items"
            :key="finding.id"
            class="grid gap-2 rounded-xl border border-default bg-default p-4"
          >
            <div class="flex flex-wrap items-center gap-2">
              <UBadge
                :color="severityColor[finding.severity] ?? 'neutral'"
                variant="subtle"
                size="lg"
              >
                {{ t(`cases.review.severity.${finding.severity}`, finding.severity) }}
              </UBadge>
              <UBadge v-if="finding.status" color="neutral" variant="outline" size="md">
                {{ t(`cases.review.status.${finding.status}`, finding.status) }}
              </UBadge>
              <span v-if="finding.code" class="ms-auto text-xs text-muted">{{ finding.code }}</span>
            </div>
            <p class="text-base font-medium text-highlighted">{{ finding.title }}</p>
            <p class="text-base leading-6 text-muted">{{ finding.messagePlain }}</p>
            <div
              v-if="finding.suggestedFix"
              class="flex items-start gap-2 rounded-lg bg-elevated/60 px-3 py-2"
            >
              <UIcon name="i-tabler-bulb" class="mt-0.5 size-4 shrink-0 text-muted" />
              <p class="text-sm text-muted">
                {{ t("cases.review.suggestedFix") }} : {{ finding.suggestedFix }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <UAlert
        v-if="hasRun && !running && !loading && findings.length === 0"
        color="success"
        variant="subtle"
        icon="i-tabler-square-rounded-check"
        :title="t('cases.review.noFindings')"
      />
    </div>
  </div>
</template>
