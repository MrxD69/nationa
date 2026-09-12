<script setup lang="ts">
const slots = useSlots();
const hasAssistant = computed(() => Boolean(slots.assistant));
</script>

<template>
  <UDashboardGroup storage-key="nationa-workspace" unit="rem">
    <AppSidebar />

    <UDashboardPanel id="workspace">
      <template #header>
        <UDashboardNavbar :title="$t('common.workspace.title')" icon="i-tabler-layout-dashboard">
          <template #right>
            <slot name="actions" />
            <UColorModeButton />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div
          v-reveal="{ y: 8, duration: 0.45 }"
          class="flex min-h-0 flex-1 flex-col gap-6 xl:flex-row"
        >
          <section class="min-w-0 flex-1">
            <div v-reveal="{ y: 12, duration: 0.4, delay: 0.05 }">
              <slot />
            </div>
          </section>

          <aside
            v-if="hasAssistant"
            v-reveal="{ direction: 'inline-end', distance: 16, duration: 0.45, delay: 0.08 }"
            class="w-full shrink-0 xl:w-96"
          >
            <slot name="assistant" />
          </aside>
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
