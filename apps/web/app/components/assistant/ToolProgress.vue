<script setup lang="ts">
const props = defineProps<{
  name: string;
  state?: string | null;
  input?: unknown;
}>();

const { t } = useI18n();

const labelKey = computed(() => `assistant.progress.${props.name}`);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const params = computed(() => {
  const input = asRecord(props.input);
  const fields = Array.isArray(input.fields) ? input.fields : [];
  const firstField = fields.length > 0 ? asRecord(fields[0]) : {};
  const query = nonEmptyString(input.query);
  const company =
    nonEmptyString(input.companyId) ?? nonEmptyString(input.company) ?? nonEmptyString(input.name);
  const fieldKey = nonEmptyString(input.key) ?? nonEmptyString(firstField.key);
  return {
    query: query ? ` « ${query} »` : "",
    company: company ? ` ${company}` : "",
    key: fieldKey ? ` (${fieldKey})` : "",
  };
});

const label = computed(() => {
  const translated = t(labelKey.value, params.value);
  return translated === labelKey.value ? t("assistant.progress.generic") : translated;
});

const indicator = computed(() => {
  if (props.state === "output-error") {
    return { icon: "i-tabler-alert-triangle", class: "text-error" };
  }
  if (props.state === "output-available") {
    return { icon: "i-tabler-check", class: "text-success" };
  }
  return { icon: "i-tabler-loader-2", class: "animate-spin text-muted" };
});
</script>

<template>
  <div class="flex items-center gap-2 text-sm text-muted">
    <UIcon :name="indicator.icon" class="size-4 shrink-0" :class="indicator.class" />
    <span class="min-w-0 truncate">{{ label }}</span>
  </div>
</template>
