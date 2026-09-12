<script setup lang="ts">
import AppAiPanel from "~/components/shell/AppAiPanel.vue";
import AppCommandPalette from "~/components/shell/AppCommandPalette.vue";
import AppCompanyBar from "~/components/shell/AppCompanyBar.vue";
import AppRail from "~/components/shell/AppRail.vue";
</script>

<template>
  <UDashboardGroup storage-key="nationa-app" unit="rem">
    <AppRail />

    <UDashboardPanel id="app-main">
      <template #header>
        <AppCompanyBar />
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>

    <AppAiPanel />
    <AppCommandPalette />
  </UDashboardGroup>
</template>
