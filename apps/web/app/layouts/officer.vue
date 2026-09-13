<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();

const isQueue = computed(
  () =>
    route.path === "/officer" ||
    (route.path.startsWith("/officer/") && !route.path.startsWith("/officer/analytics")),
);

const items = computed(() => [
  {
    label: t("officer.nav.queue"),
    icon: "i-tabler-inbox",
    to: "/officer",
    active: isQueue.value,
  },
  {
    label: t("officer.nav.analytics"),
    icon: "i-tabler-chart-bar",
    to: "/officer/analytics",
    active: route.path.startsWith("/officer/analytics"),
  },
]);
</script>

<template>
  <UDashboardGroup storage-key="nationa-officer" unit="rem">
    <UDashboardPanel id="officer">
      <template #header>
        <UDashboardNavbar :title="$t('officer.title')" icon="i-tabler-clipboard-check">
          <template #right>
            <UButton
              to="/"
              color="neutral"
              variant="ghost"
              icon="i-tabler-layout-dashboard"
              :label="$t('officer.common.backToWorkspace')"
            />
            <UColorModeButton />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6">
          <nav v-reveal="{ y: 8, duration: 0.4 }" class="flex flex-wrap gap-2">
            <UButton
              v-for="item in items"
              :key="item.to"
              :to="item.to"
              :icon="item.icon"
              :label="item.label"
              :color="item.active ? 'primary' : 'neutral'"
              :variant="item.active ? 'soft' : 'ghost'"
              :aria-current="item.active ? 'page' : undefined"
            />
          </nav>
          <div v-reveal="{ y: 12, duration: 0.4, delay: 0.05 }">
            <slot />
          </div>
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
