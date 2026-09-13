<script setup lang="ts">
import ActionHub from "~/components/action/ActionHub.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const { accessibleCompanyId } = useSelectedCompany();

const companyId = computed(() => accessibleCompanyId.value ?? undefined);
</script>

<template>
  <div class="w-full">
    <ActionHub :company-id="companyId" />
  </div>
</template>
