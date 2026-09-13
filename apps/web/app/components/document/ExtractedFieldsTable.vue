<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";
import { FIELD_LABELS } from "@nationa/api/domain/fields";
import type { ExtractedFieldItem } from "~/composables/useUpload";

const props = defineProps<{ fields?: ExtractedFieldItem[] }>();

const { t, locale } = useI18n();

type Row = ExtractedFieldItem;

function humanizeKey(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function labelFor(row: Row): string {
  const normalized = row.normalizedKey ?? null;
  if (normalized && normalized in FIELD_LABELS) {
    const label = FIELD_LABELS[normalized as keyof typeof FIELD_LABELS];
    return (locale.value === "ar" ? label.ar : label.fr) || label.fr || humanizeKey(row.key);
  }
  const raw = row.labelRaw || row.key;
  return raw ? humanizeKey(raw) : t("documents.fields.key");
}

function humanizeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return t("documents.fields.noValue");
  }
  if (Array.isArray(value)) {
    return value.map((entry) => humanizeValue(entry)).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${humanizeKey(key)}: ${humanizeValue(entry)}`)
      .join(" · ");
  }
  return String(value);
}

function displayValue(row: Row): string {
  if (row.valueText) {
    return row.valueText;
  }
  return humanizeValue(row.valueJsonb);
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
