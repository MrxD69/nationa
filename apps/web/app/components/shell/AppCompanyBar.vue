<script setup lang="ts">
import AppCompanySwitcher from "./AppCompanySwitcher.vue";

const { t } = useI18n();
const { open, toggle } = useAssistantPanel();
</script>

<template>
  <UDashboardNavbar>
    <template #left>
      <AppCompanySwitcher />
    </template>

    <template #right>
      <UButton
        icon="i-tabler-sparkles"
        :color="open ? 'primary' : 'neutral'"
        :variant="open ? 'soft' : 'ghost'"
        size="lg"
        :label="t('shell.ai.title')"
        :aria-label="open ? t('shell.ai.close') : t('shell.ai.open')"
        :aria-pressed="open"
        @click="toggle()"
      />
    </template>
  </UDashboardNavbar>
</template>
