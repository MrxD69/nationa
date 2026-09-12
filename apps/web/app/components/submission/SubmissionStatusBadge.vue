<script setup lang="ts">
type SubmissionStatus =
  | "draft"
  | "queued"
  | "in_review"
  | "approved"
  | "rejected"
  | "returned"
  | "escalated";

const props = defineProps<{ status: SubmissionStatus | string }>();

const { t } = useI18n();

const config = computed(() => {
  switch (props.status) {
    case "approved":
      return {
        color: "success" as const,
        variant: "subtle" as const,
        icon: "i-tabler-circle-check",
      };
    case "rejected":
      return { color: "error" as const, variant: "subtle" as const, icon: "i-tabler-circle-x" };
    case "returned":
      return {
        color: "warning" as const,
        variant: "subtle" as const,
        icon: "i-tabler-arrow-back-up",
      };
    case "escalated":
      return {
        color: "warning" as const,
        variant: "solid" as const,
        icon: "i-tabler-arrow-up-right",
      };
    case "in_review":
      return { color: "info" as const, variant: "subtle" as const, icon: "i-tabler-eye" };
    case "queued":
      return { color: "primary" as const, variant: "soft" as const, icon: "i-tabler-clock" };
    default:
      return { color: "neutral" as const, variant: "subtle" as const, icon: "i-tabler-file" };
  }
});
</script>

<template>
  <UBadge :color="config.color" :variant="config.variant" :icon="config.icon" class="gap-1.5">
    {{ t(`submissions.status.${status}`, status) }}
  </UBadge>
</template>
