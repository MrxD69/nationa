<script setup lang="ts">
const props = defineProps<{
  source?: string | null;
  confidence?: number | string | null;
  label?: string | null;
}>();

const { t } = useI18n();

const source = computed(() => (props.source && props.source.length > 0 ? props.source : "user"));
const sourceLabel = computed(() => t(`companies.provenance.${source.value}`));

const confidenceValue = computed(() => {
  if (props.confidence === null || props.confidence === undefined || props.confidence === "") {
    return null;
  }
  const value = Number(props.confidence);
  return Number.isFinite(value) ? value : null;
});

const displayLabel = computed(() => props.label ?? sourceLabel.value);

const tooltip = computed(() => {
  const parts = [displayLabel.value];
  if (confidenceValue.value !== null) {
    parts.push(
      `${t("companies.provenance.confidence")} ${Math.round(confidenceValue.value * 100)}%`,
    );
  }
  return parts.join(" · ");
});

const color = computed(() => {
  switch (source.value) {
    case "document":
      return "info";
    case "ai":
      return "primary";
    case "import":
      return "warning";
    case "system":
      return "neutral";
    default:
      return "neutral";
  }
});
</script>

<template>
  <UTooltip :text="tooltip">
    <UBadge :color="color" variant="subtle" size="lg" :label="displayLabel" />
  </UTooltip>
</template>
