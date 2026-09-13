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
  >
    <template #description>
      <p class="text-sm text-muted">
        {{ t("submissions.detail.blockersDescription", { count: blockers.length }) }}
      </p>

      <div class="mt-3 space-y-2">
        <div
          v-for="(finding, index) in blockers"
          :key="finding.id ?? index"
          class="rounded-md border border-default/60 bg-default/40 p-3"
        >
          <p class="text-base font-medium text-highlighted">{{ translate(finding, "title") }}</p>
          <p class="text-sm text-muted">{{ translate(finding, "message") }}</p>
        </div>
      </div>

      <div class="mt-3 rounded-md border border-default/60 bg-default/40 p-3">
        <UCheckbox v-model="acknowledged" :label="t('submissions.detail.blockerAcknowledgeAll')" />
        <p class="ms-7 mt-1 text-sm text-muted">
          {{ t("submissions.detail.blockerAcknowledgeHint") }}
        </p>
      </div>
    </template>
  </UAlert>
</template>
