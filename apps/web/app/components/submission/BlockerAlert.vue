<script setup lang="ts">
type Finding = {
  id?: string;
  code?: string;
  title: string;
  messagePlain: string;
  severity: string;
};

defineProps<{ blockers: Finding[] }>();

const acknowledged = defineModel<boolean>("acknowledged", { default: false });

const { t, te } = useI18n();

function translate(finding: Finding, field: "title" | "message"): string {
  if (!finding.code) {
    return field === "title" ? finding.title : finding.messagePlain;
  }
  const key = `checks.findings.${finding.code}.${field}`;
  if (te(key)) {
    return t(key);
  }
  return field === "title" ? finding.title : finding.messagePlain;
}
</script>

<template>
  <UAlert
    v-if="blockers.length > 0"
    color="error"
    variant="subtle"
    icon="i-tabler-alert-octagon"
    :title="t('submissions.detail.blockers')"
    :description="t('submissions.detail.blockersDescription', { count: blockers.length })"
  >
    <template #description>
      <div class="mt-2 space-y-2">
        <div
          v-for="(finding, index) in blockers"
          :key="finding.id ?? index"
          class="rounded-lg border border-default/60 bg-default/40 p-3"
        >
          <p class="text-sm font-medium text-highlighted">{{ translate(finding, "title") }}</p>
          <p class="text-xs text-muted">{{ translate(finding, "message") }}</p>
        </div>

        <UCheckbox v-model="acknowledged" :label="t('submissions.detail.resubmitAcknowledge')" />
      </div>
    </template>
  </UAlert>
</template>
