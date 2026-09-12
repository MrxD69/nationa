<script setup lang="ts">
type CleanlinessTier = "clean" | "minor_concern" | "needs_review";

const props = withDefaults(
  defineProps<{
    tier: CleanlinessTier | string;
    score?: string | number | null;
    showScore?: boolean;
  }>(),
  { score: null, showScore: true },
);

const { t } = useI18n();

const config = computed(() => {
  switch (props.tier) {
    case "clean":
      return {
        color: "success" as const,
        variant: "subtle" as const,
        icon: "i-tabler-shield-check",
      };
    case "minor_concern":
      return {
        color: "warning" as const,
        variant: "subtle" as const,
        icon: "i-tabler-alert-triangle",
      };
    default:
      return {
        color: "error" as const,
        variant: "subtle" as const,
        icon: "i-tabler-alert-octagon",
      };
  }
});

const formattedScore = computed(() => {
  if (props.score === null || props.score === undefined || props.score === "") {
    return null;
  }
  const value = Number(props.score);
  return Number.isFinite(value) ? value.toFixed(2) : String(props.score);
});
</script>

<template>
  <UBadge :color="config.color" :variant="config.variant" :icon="config.icon" class="gap-1.5">
    <span>{{ t(`submissions.cleanliness.${tier}`, tier) }}</span>
    <span v-if="showScore && formattedScore" class="font-mono text-xs opacity-80">
      {{ formattedScore }}
    </span>
  </UBadge>
</template>
