<script setup lang="ts">
import AppCompanySwitcher from "./AppCompanySwitcher.vue";
import AppNotifications from "~/components/shell/AppNotifications.vue";
import LocaleSwitcher from "~/components/LocaleSwitcher.vue";

const { t } = useI18n();
const { open, toggle } = useAssistantPanel();
const { toggle: toggleCommandPalette } = useCommandPalette();
</script>

<template>
  <UDashboardNavbar>
    <template #left>
      <AppCompanySwitcher />
    </template>

    <template #right>
      <div class="flex items-center gap-1 sm:gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-tabler-search"
          class="press"
          :aria-label="t('shell.rail.search')"
          :title="t('shell.rail.search')"
          @click="toggleCommandPalette()"
        >
          <span class="hidden sm:inline">{{ t("shell.rail.search") }}</span>
        </UButton>

        <AppNotifications />

        <UColorModeButton class="press" />

        <LocaleSwitcher compact />

        <UButton
          icon="i-tabler-sparkles"
          :color="open ? 'primary' : 'neutral'"
          :variant="open ? 'soft' : 'ghost'"
          :label="t('shell.ai.title')"
          :aria-label="open ? t('shell.ai.close') : t('shell.ai.open')"
          :aria-pressed="open"
          @click="toggle()"
        />
      </div>
    </template>
  </UDashboardNavbar>
</template>
