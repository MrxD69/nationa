<script setup lang="ts">
import AppCompanySwitcher from "./AppCompanySwitcher.vue";
import AppCompanyTabs from "./AppCompanyTabs.vue";

const { t } = useI18n();
const route = useRoute();
const { hasCompany } = useSelectedCompany();
const { open, toggle } = useAssistantPanel();

const showTabs = computed(() => {
  const path = route.path;
  if (path === "/companies") {
    return false;
  }
  return !["/submissions", "/settings", "/help"].some((prefix) => path.startsWith(prefix));
});
</script>

<template>
  <UDashboardNavbar>
    <template #left>
      <AppCompanySwitcher />
    </template>

    <AppCompanyTabs v-if="hasCompany && showTabs" />

    <template #right>
      <UButton
        icon="i-tabler-sparkles"
        :color="open ? 'primary' : 'neutral'"
        variant="ghost"
        square
        :aria-label="t('shell.ai.open')"
        @click="toggle()"
      />
    </template>
  </UDashboardNavbar>
</template>
