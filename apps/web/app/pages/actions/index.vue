<script setup lang="ts">
import ActionHub from "~/components/action/ActionHub.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const { accessibleCompanyId } = useSelectedCompany();

const companyId = computed(() => accessibleCompanyId.value ?? undefined);
</script>

<template>
  <div class="mx-auto w-full max-w-7xl">
    <ActionHub :company-id="companyId" />
  </div>
</template>
