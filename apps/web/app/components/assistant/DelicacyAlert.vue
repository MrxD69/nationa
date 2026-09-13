<script setup lang="ts">
const props = defineProps<{
  summary: string;
  severity?: string | null;
  reasons?: string[];
}>();

const { t } = useI18n();

const color = computed(() => (props.severity === "critical" ? "error" : "warning"));
</script>

<template>
  <UAlert
    :color="color"
    variant="soft"
    class="rounded-lg"
    icon="i-tabler-alert-triangle"
    :title="t('assistant.delicate.title')"
    :description="[summary, ...(reasons ?? [])].join(' · ')"
  />
</template>
