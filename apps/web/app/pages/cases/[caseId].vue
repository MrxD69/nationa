<script setup lang="ts">
import CaseRunner from "~/components/case/CaseRunner.vue";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const caseId = computed(() => String(route.params.caseId ?? ""));
</script>

<template>
  <UContainer class="py-8">
    <CaseRunner v-if="caseId" :key="caseId" :case-id="caseId" />
  </UContainer>
</template>
