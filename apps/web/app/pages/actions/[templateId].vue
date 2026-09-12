<script setup lang="ts">
import ActionStepTracker from "~/components/action/ActionStepTracker.vue";

definePageMeta({ middleware: "auth" });

const route = useRoute();

const templateId = computed(() => String(route.params.templateId ?? ""));

const companyId = computed(() => {
  const value = route.query.companyId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
});

const caseId = computed(() => {
  const value = route.query.caseId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
});
</script>

<template>
  <UContainer class="py-8">
    <ActionStepTracker
      v-if="templateId"
      :key="`${templateId}:${caseId ?? ''}`"
      :template-id="templateId"
      :case-id="caseId"
      :company-id="companyId"
    />
  </UContainer>
</template>
