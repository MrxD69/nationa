<script setup lang="ts">
import ActionStepTracker from "~/components/action/ActionStepTracker.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const route = useRoute();
const { accessibleCompanyId } = useSelectedCompany();

const templateId = computed(() => String(route.params.templateId ?? ""));

const companyId = computed(() => accessibleCompanyId.value ?? undefined);

const caseId = computed(() => {
  const value = route.query.caseId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
});
</script>

<template>
  <div class="mx-auto w-full max-w-6xl">
    <ActionStepTracker
      v-if="templateId"
      :key="`${templateId}:${caseId ?? ''}`"
      :template-id="templateId"
      :case-id="caseId"
      :company-id="companyId"
    />
  </div>
</template>
