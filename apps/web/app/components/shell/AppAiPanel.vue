<script setup lang="ts">
import AssistantPanel from "~/components/assistant/AssistantPanel.vue";

const route = useRoute();
const { t } = useI18n();
const { open, setOpen } = useAssistantPanel();
const { accessibleCompanyId } = useSelectedCompany();
const { stepId, docgenProposalId } = useAssistantContext();

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
    dropped by Vue. It is `v-if` so the panel — and every assistant query — only
    exists while open. Below `lg` it becomes a full-screen sheet; from `lg` up it
    is `display: contents`, keeping it inline and resizable in the dashboard flex.
  -->
  <div
    v-if="open"
    class="max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:block max-lg:bg-default lg:contents"
  >
    <UDashboardPanel
      id="app-ai"
      resizable
      :default-size="26"
      :min-size="22"
      :max-size="36"
      class="max-lg:h-full overflow-hidden"
      :ui="{
        body: 'flex min-h-0 flex-1 flex-col gap-0 overflow-hidden overflow-y-hidden p-0 sm:gap-0 sm:p-0',
        handle: 'max-lg:hidden',
      }"
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
              square
              icon="i-tabler-x"
              :aria-label="t('shell.ai.close')"
              @click="setOpen(false)"
            />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <AssistantPanel
          :company-id="accessibleCompanyId"
          :case-id="caseId"
          :step-id="stepId"
          :docgen-proposal-id="docgenProposalId"
          @close="setOpen(false)"
        />
      </template>
    </UDashboardPanel>
  </div>
</template>
