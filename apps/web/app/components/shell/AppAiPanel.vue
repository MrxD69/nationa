<script setup lang="ts">
import AssistantPanel from "~/components/assistant/AssistantPanel.vue";

const route = useRoute();
const { t } = useI18n();
const { open, setOpen } = useAssistantPanel();
const { selectedCompanyId } = useSelectedCompany();

const caseId = computed(() => {
  const value = route.params.caseId;
  const id = Array.isArray(value) ? value[0] : value;
  return typeof id === "string" && id.length > 0 ? id : null;
});
</script>

<template>
  <!--
    A `UDashboardPanel` rather than a second `UDashboardSidebar`: `UDashboardGroup`
    exposes a single shared `sidebarOpen` / `sidebarCollapsed` pair, and every
    mounted sidebar answers the global `dashboard:sidebar:*` hooks. Two sidebars
    therefore fight over one collapse channel and the rail can never re-expand.

    The wrapper exists because a resizable `UDashboardPanel` renders a fragment
    (panel + resize handle), and a directive on a multi-root component is silently
    dropped by Vue. `display: contents` keeps it out of the flex layout, and
    `v-show` on it hides the panel and its handle together while preserving the
    conversation, scroll position and resized width.
  -->
  <div v-show="open" class="contents">
    <UDashboardPanel
      id="app-ai"
      resizable
      :default-size="26"
      :min-size="22"
      :max-size="36"
      :ui="{ body: 'flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0' }"
    >
      <template #header>
        <UDashboardNavbar :toggle="false">
          <template #left>
            <h2 class="truncate text-lg font-semibold text-highlighted">
              {{ t("shell.ai.title") }}
            </h2>
          </template>

          <template #right>
            <UButton
              color="neutral"
              variant="ghost"
              size="lg"
              square
              icon="i-tabler-x"
              :aria-label="t('shell.ai.close')"
              @click="setOpen(false)"
            />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <AssistantPanel :company-id="selectedCompanyId" :case-id="caseId" @close="setOpen(false)" />
      </template>
    </UDashboardPanel>
  </div>
</template>
