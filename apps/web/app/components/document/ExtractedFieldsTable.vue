<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";
import { FIELD_LABELS } from "@nationa/api/domain/fields";
import type { ExtractedFieldItem } from "~/composables/useUpload";

const props = defineProps<{
  fields?: ExtractedFieldItem[];
  importantFields?: string[];
}>();

const { t, locale } = useI18n();

type Row = ExtractedFieldItem & { important?: boolean; missing?: boolean };

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

function hasValue(row: Row): boolean {
  if (
    row.valueText !== null &&
    row.valueText !== undefined &&
    String(row.valueText).trim() !== ""
  ) {
    return true;
  }
  const json = row.valueJsonb;
  if (json === null || json === undefined) {
    return false;
  }
  if (Array.isArray(json)) {
    return json.length > 0;
  }
  if (typeof json === "object") {
    return Object.keys(json as Record<string, unknown>).length > 0;
  }
  return String(json).trim() !== "";
}

function displayValue(row: Row): string {
  if (!hasValue(row)) {
    return t("documents.fields.noValue");
  }
  if (row.valueText) {
    return row.valueText;
  }
  return humanizeValue(row.valueJsonb);
}

function rowKey(row: Row): string {
  return String(row.normalizedKey ?? row.key ?? "").toLowerCase();
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

/**
 * Merge the document type's expected ("important") fields with whatever OCR
 * actually extracted. Expected-but-missing fields are surfaced so they can be
 * flagged in red; extracted fields are flagged green.
 */
const rows = computed<Row[]>(() => {
  const extracted = (props.fields ?? []) as Row[];
  const important = (props.importantFields ?? []).filter((key) => key && key.length > 0);
  const importantKeys = new Set(important.map((key) => key.toLowerCase()));
  const presentKeys = new Set(extracted.map((row) => rowKey(row)));

  const present: Row[] = extracted.map((row) => ({
    ...row,
    important: importantKeys.has(rowKey(row)),
  }));

  const missing: Row[] = important
    .filter((key) => !presentKeys.has(key.toLowerCase()))
    .map((key) => ({
      id: `missing:${key}`,
      key,
      labelRaw: null,
      normalizedKey: key,
      valueText: null,
      valueJsonb: null,
      confidence: null,
      important: true,
      missing: true,
    }));

  return [...present, ...missing];
});

const columns = computed<TableColumn<Row>[]>(() => [
  {
    accessorKey: "key",
    header: t("documents.fields.key"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-base font-medium text-highlighted" },
        labelFor(row.original),
      ),
  },
  {
    accessorKey: "valueText",
    header: t("documents.fields.value"),
    cell: ({ row }) => {
      const filled = hasValue(row.original);
      return h(
        "span",
        {
          class: [
            "inline-flex max-w-full items-center gap-2 rounded-md px-2 py-0.5 text-base font-medium",
            filled ? "bg-success/10 text-success" : "bg-error/10 text-error",
          ],
        },
        [
          h("span", {
            class: ["size-2 shrink-0 rounded-full", filled ? "bg-success" : "bg-error"],
            "aria-hidden": "true",
          }),
          h("span", { class: "min-w-0 break-words" }, displayValue(row.original)),
        ],
      );
    },
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
