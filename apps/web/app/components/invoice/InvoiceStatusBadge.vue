<script setup lang="ts">
const props = defineProps<{ status?: string | null }>();

const { t } = useI18n();

const color = computed(() => {
  switch (props.status) {
    case "verified":
      return "success" as const;
    case "needs_review":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
});

const label = computed(() => {
  if (!props.status) {
    return "";
  }
  const key = `invoices.status.${props.status}`;
  const translated = t(key);
  return translated === key ? props.status : translated;
});
</script>

<template>
  <UBadge v-if="status" :color="color" variant="subtle" size="lg" :label="label" />
</template>
