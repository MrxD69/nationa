<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";
import { FIELD_LABELS } from "@nationa/api/domain/fields";
import type { ExtractedFieldItem } from "~/composables/useUpload";

const props = defineProps<{ fields?: ExtractedFieldItem[] }>();

const { t, locale } = useI18n();

type Row = ExtractedFieldItem;

function labelFor(row: Row): string {
  const normalized = row.normalizedKey ?? null;
  if (normalized && normalized in FIELD_LABELS) {
    const label = FIELD_LABELS[normalized as keyof typeof FIELD_LABELS];
    return (locale.value === "ar" ? label.ar : label.fr) || label.fr || row.labelRaw || row.key;
  }
  return row.labelRaw || row.key;
}

function displayValue(row: Row): string {
  if (row.valueText) {
    return row.valueText;
  }
  if (row.valueJsonb !== null && row.valueJsonb !== undefined) {
    try {
      return JSON.stringify(row.valueJsonb);
    } catch {
      return String(row.valueJsonb);
    }
  }
  return t("documents.fields.noValue");
}

function confidenceNumber(row: Row): number | null {
  if (row.confidence === null || row.confidence === undefined || row.confidence === "") {
    return null;
  }
  const value = Number(row.confidence);
  return Number.isFinite(value) ? value : null;
}

function confidenceClass(row: Row): string {
  const value = confidenceNumber(row);
  if (value === null) {
    return "text-muted";
  }
  if (value >= 0.85) {
    return "text-success";
  }
  if (value >= 0.6) {
    return "text-warning";
  }
  return "text-error";
}

function formatConfidence(row: Row): string {
  const value = confidenceNumber(row);
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

const rows = computed(() => props.fields ?? []);

const columns = computed<TableColumn<Row>[]>(() => [
  {
    accessorKey: "key",
    header: t("documents.fields.key"),
    cell: ({ row }) =>
      h("span", { class: "text-base font-medium text-highlighted" }, labelFor(row.original)),
  },
  {
    accessorKey: "valueText",
    header: t("documents.fields.value"),
    cell: ({ row }) => h("span", { class: "break-words text-base" }, displayValue(row.original)),
  },
  {
    accessorKey: "confidence",
    header: t("documents.fields.confidence"),
    cell: ({ row }) =>
      h(
        "span",
        { class: ["text-base font-medium", confidenceClass(row.original)] },
        formatConfidence(row.original),
      ),
  },
]);
</script>

<template>
  <UTable :data="rows" :columns="columns" :empty="t('documents.fields.empty')" />
</template>
