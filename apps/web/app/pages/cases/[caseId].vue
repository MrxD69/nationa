<script setup lang="ts">
import CaseRunner from "~/components/case/CaseRunner.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const route = useRoute();
const { selectedCompanyId, selectCompany } = useSelectedCompany();
const api = useCase();

const caseId = computed(() => String(route.params.caseId ?? ""));
const { data } = api.caseQuery(caseId.value);

watch(
  () => data.value?.case?.companyId,
  (companyId) => {
    if (companyId && !selectedCompanyId.value) {
      selectCompany(companyId);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="mx-auto w-full max-w-6xl">
    <CaseRunner v-if="caseId" :key="caseId" :case-id="caseId" />
  </div>
</template>
