<script setup lang="ts">
type Severity = "info" | "warning" | "error" | "blocker";

const props = defineProps<{ severity: Severity }>();

const { t } = useI18n();

const config = computed(() => {
  switch (props.severity) {
    case "blocker":
      return {
        icon: "i-tabler-alert-octagon",
        color: "error" as const,
        variant: "solid" as const,
      };
    case "error":
      return {
        icon: "i-tabler-square-rounded-x",
        color: "error" as const,
        variant: "subtle" as const,
      };
    case "warning":
      return {
        icon: "i-tabler-alert-triangle",
        color: "warning" as const,
        variant: "subtle" as const,
      };
    default:
      return {
        icon: "i-tabler-info-square-rounded",
        color: "info" as const,
        variant: "subtle" as const,
      };
  }
});
</script>

<template>
  <UBadge :color="config.color" :variant="config.variant" :icon="config.icon" class="gap-1.5">
    <span>{{ t(`checks.severity.${severity}`) }}</span>
  </UBadge>
</template>
