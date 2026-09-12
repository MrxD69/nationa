<script setup lang="ts">
const props = defineProps<{ status?: string | null }>();

const { t } = useI18n();

const color = computed(() => {
  switch (props.status) {
    case "ready":
      return "success" as const;
    case "under_review":
      return "warning" as const;
    case "submitted":
      return "info" as const;
    case "approved":
      return "success" as const;
    case "rejected":
      return "error" as const;
    default:
      return "neutral" as const;
  }
});

const label = computed(() => {
  if (!props.status) {
    return "";
  }
  const key = `filings.status.${props.status}`;
  const translated = t(key);
  return translated === key ? props.status : translated;
});
</script>

<template>
  <UBadge v-if="status" :color="color" variant="subtle" size="sm" :label="label" />
</template>
