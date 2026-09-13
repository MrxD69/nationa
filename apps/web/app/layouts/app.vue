<script setup lang="ts">
import AppAiPanel from "~/components/shell/AppAiPanel.vue";
import AppCommandPalette from "~/components/shell/AppCommandPalette.vue";
import AppCompanyBar from "~/components/shell/AppCompanyBar.vue";
import AppCompanyTabs from "~/components/shell/AppCompanyTabs.vue";
import AppRail from "~/components/shell/AppRail.vue";

const route = useRoute();
const { hasCompany } = useSelectedCompany();

/**
 * The company tab row only makes sense on company-scoped screens. It lives here
 * (a `UDashboardToolbar` under the navbar) rather than inside the navbar's
 * default slot, because that slot carries `hidden lg:flex` and would hide every
 * tab below 1024px.
 */
const showTabs = computed(() => {
  const path = route.path;
  if (path === "/companies") {
    return false;
  }
  // Démarches are public templates reached from the rail, not company tabs.
  return !["/submissions", "/settings", "/help", "/actions"].some((prefix) =>
    path.startsWith(prefix),
  );
});
</script>

<template>
  <UDashboardGroup storage-key="nationa-app" unit="rem">
    <AppRail />

    <UDashboardPanel id="app-main">
      <template #header>
        <AppCompanyBar />

        <UDashboardToolbar v-if="hasCompany && showTabs">
          <AppCompanyTabs />
        </UDashboardToolbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>

    <AppAiPanel />
    <AppCommandPalette />
  </UDashboardGroup>
</template>
