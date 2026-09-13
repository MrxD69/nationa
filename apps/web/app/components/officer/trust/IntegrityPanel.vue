<script setup lang="ts">
import OfficerDataRow from "~/components/officer/ui/OfficerDataRow.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

type IntegrityCheck = {
  code: string;
  labelFr: string;
  status: "pass" | "warn" | "fail" | "unknown";
  detail?: string | null;
};

type Integrity = {
  documentId?: string;
  title?: string | null;
  documentVersionId?: string;
  version?: number | string | null;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
  hash?: string | null;
  hasHash?: boolean;
  source?: string | null;
  uploadedAt?: string | Date | null;
  uploadedByUserId?: string | null;
  pageCount?: number | null;
  isCurrent?: boolean;
  documentStatus?: string | null;
  authenticity?: {
    checks?: IntegrityCheck[];
    verificationNumber?: string | null;
    extractNumber?: string | null;
    editionDate?: string | null;
    registryState?: string | null;
  } | null;
};

const props = withDefaults(defineProps<{ integrity: Integrity | null; loading?: boolean }>(), {
  loading: false,
});

const { t, locale } = useI18n();
const toast = useToast();

const checks = computed<IntegrityCheck[]>(() => props.integrity?.authenticity?.checks ?? []);

type Verdict = "ok" | "error" | "warn" | "unknown";

const verdict = computed<Verdict>(() => {
  if (checks.value.length === 0) {
    return "unknown";
  }
  if (checks.value.every((check) => check.status === "pass")) {
    return "ok";
  }
  if (checks.value.some((check) => check.status === "fail")) {
    return "error";
  }
  if (checks.value.some((check) => check.status === "warn")) {
    return "warn";
  }
  return "unknown";
});

const verdictConfig = computed(() => {
  switch (verdict.value) {
    case "ok":
      return {
        color: "success" as const,
        icon: "i-tabler-shield-check",
        title: t("officerTrust.integrity.verdictOk"),
        description: t("officerTrust.integrity.verdictOkDescription"),
      };
    case "error":
      return {
        color: "error" as const,
        icon: "i-tabler-shield-x",
        title: t("officerTrust.integrity.verdictError"),
        description: t("officerTrust.integrity.verdictErrorDescription"),
      };
    case "warn":
      return {
        color: "warning" as const,
        icon: "i-tabler-shield-exclamation",
        title: t("officerTrust.integrity.verdictWarn"),
        description: t("officerTrust.integrity.verdictWarnDescription"),
      };
    default:
      return {
        color: "neutral" as const,
        icon: "i-tabler-shield-question",
        title: t("officerTrust.integrity.verdictUnknown"),
        description: t("officerTrust.integrity.verdictUnknownDescription"),
      };
  }
});

function statusConfig(status: string) {
  switch (status) {
    case "pass":
      return {
        color: "success" as const,
        icon: "i-tabler-circle-check",
        label: t("officerTrust.integrity.statuses.pass"),
      };
    case "warn":
      return {
        color: "warning" as const,
        icon: "i-tabler-alert-triangle",
        label: t("officerTrust.integrity.statuses.warn"),
      };
    case "fail":
      return {
        color: "error" as const,
        icon: "i-tabler-circle-x",
        label: t("officerTrust.integrity.statuses.fail"),
      };
    default:
      return {
        color: "neutral" as const,
        icon: "i-tabler-help-circle",
        label: t("officerTrust.integrity.statuses.unknown"),
      };
  }
}

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return t("officerTrust.common.none");
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? t("officerTrust.common.none")
    : date.toLocaleDateString(locale.value);
}

function formatBytes(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return t("officerTrust.common.none");
  }
  const units = ["o", "Ko", "Mo", "Go"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 ? String(size) : size.toFixed(size >= 10 ? 0 : 1);
  return `${rounded} ${units[unit]}`;
}

const hashValue = computed(() => props.integrity?.hash ?? null);

const hashPreview = computed(() => {
  const value = hashValue.value;
  if (!value) {
    return null;
  }
  return value.length > 20 ? `${value.slice(0, 12)}…${value.slice(-6)}` : value;
});

async function copyHash() {
  if (!hashValue.value) {
    return;
  }
  try {
    await navigator.clipboard.writeText(hashValue.value);
    toast.add({ title: t("officerTrust.common.copied"), color: "success" });
  } catch {
    toast.add({ title: t("officerTrust.common.copy"), color: "neutral" });
  }
}
</script>

<template>
  <div class="space-y-4">
    <LoadingState v-if="loading && !integrity" :label="t('officerTrust.integrity.loading')" />

    <template v-else>
      <UAlert
        :color="verdictConfig.color"
        variant="subtle"
        :icon="verdictConfig.icon"
        :title="verdictConfig.title"
        :description="verdictConfig.description"
      />

      <section class="space-y-2">
        <h3 class="text-sm font-semibold text-highlighted">
          {{ t("officerTrust.integrity.checks") }}
        </h3>

        <p v-if="checks.length === 0" class="text-sm text-muted">
          {{ t("officerTrust.integrity.noChecks") }}
        </p>

        <ul v-else class="divide-y divide-default">
          <li
            v-for="check in checks"
            :key="check.code"
            class="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">{{ check.labelFr }}</p>
              <p v-if="check.detail" class="text-sm text-muted">{{ check.detail }}</p>
            </div>
            <UBadge
              :color="statusConfig(check.status).color"
              variant="subtle"
              :icon="statusConfig(check.status).icon"
              :label="statusConfig(check.status).label"
              class="shrink-0 self-start"
            />
          </li>
        </ul>
      </section>

      <section class="space-y-1">
        <OfficerDataRow
          :label="t('officerTrust.integrity.fields.verificationNumber')"
          :value="integrity?.authenticity?.verificationNumber"
          mono
        />
        <OfficerDataRow
          :label="t('officerTrust.integrity.fields.extractNumber')"
          :value="integrity?.authenticity?.extractNumber"
          mono
        />
        <OfficerDataRow
          :label="t('officerTrust.integrity.fields.editionDate')"
          :value="formatDate(integrity?.authenticity?.editionDate)"
        />
        <OfficerDataRow
          :label="t('officerTrust.integrity.fields.registryState')"
          :value="integrity?.authenticity?.registryState"
        />
        <OfficerDataRow
          :label="t('officerTrust.integrity.fields.fileName')"
          :value="integrity?.fileName"
        />
        <OfficerDataRow
          :label="t('officerTrust.integrity.fields.mimeType')"
          :value="integrity?.mimeType"
        />
        <OfficerDataRow
          :label="t('officerTrust.integrity.fields.size')"
          :value="formatBytes(integrity?.size)"
        />
        <OfficerDataRow
          :label="t('officerTrust.integrity.fields.version')"
          :value="integrity?.version"
        />
        <OfficerDataRow
          :label="t('officerTrust.integrity.fields.pageCount')"
          :value="integrity?.pageCount"
        />
        <OfficerDataRow
          :label="t('officerTrust.integrity.fields.source')"
          :value="integrity?.source"
        />
        <OfficerDataRow
          :label="t('officerTrust.integrity.fields.uploadedAt')"
          :value="formatDate(integrity?.uploadedAt)"
        />

        <OfficerDataRow :label="t('officerTrust.integrity.fields.hash')" mono>
          <span v-if="hashValue" class="inline-flex items-center gap-2">
            <span class="truncate" :title="hashValue">{{ hashPreview }}</span>
            <UButton
              color="neutral"
              variant="ghost"
              size="md"
              icon="i-tabler-copy"
              square
              :title="t('officerTrust.integrity.copyHash')"
              :aria-label="t('officerTrust.integrity.copyHash')"
              @click="copyHash"
            />
          </span>
          <span v-else class="text-muted">{{ t("officerTrust.integrity.hashMissing") }}</span>
        </OfficerDataRow>
      </section>

      <p class="flex items-start gap-2 border-t border-default pt-3 text-sm text-muted">
        <UIcon name="i-tabler-info-circle" class="mt-0.5 size-4 shrink-0" />
        <span>{{ t("officerTrust.integrity.footnote") }}</span>
      </p>
    </template>
  </div>
</template>
