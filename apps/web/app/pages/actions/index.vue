<script setup lang="ts">
import ActionHub from "~/components/action/ActionHub.vue";

definePageMeta({ middleware: "auth" });

const route = useRoute();

const companyId = computed(() => {
  const value = route.query.companyId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
});
</script>

<template>
  <UContainer class="py-8">
    <ActionHub :company-id="companyId" />
  </UContainer>
</template>
