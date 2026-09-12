<script setup lang="ts">
import ActionHub from "~/components/action/ActionHub.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const { selectedCompanyId } = useSelectedCompany();

const companyId = computed(() => selectedCompanyId.value ?? undefined);
</script>

<template>
  <div class="mx-auto w-full max-w-7xl">
    <ActionHub :company-id="companyId" />
  </div>
</template>
