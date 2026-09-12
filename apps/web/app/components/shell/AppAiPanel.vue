<script setup lang="ts">
import AssistantPanel from "~/components/assistant/AssistantPanel.vue";
import { dirForLocale } from "~/constants/navigation";

const route = useRoute();
const { t, locale } = useI18n();
const { open, setOpen } = useAssistantPanel();
const { selectedCompanyId } = useSelectedCompany();

const side = computed(() => (dirForLocale(locale.value) === "rtl" ? "left" : "right"));

const caseId = computed(() => {
  const value = route.params.caseId;
  const id = Array.isArray(value) ? value[0] : value;
  return typeof id === "string" && id.length > 0 ? id : null;
});
</script>

<template>
  <UDashboardSidebar
    v-if="open"
    id="app-ai"
    v-model:open="open"
    :side="side"
    :menu="{ side, modal: false }"
    :toggle="false"
    :auto-close="false"
    resizable
    :default-size="22"
    :min-size="18"
    :max-size="30"
    :ui="{ body: 'flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0' }"
  >
    <template #header>
      <div class="flex w-full items-center justify-between gap-2">
        <h2 class="truncate text-sm font-semibold text-highlighted">
          {{ t("shell.ai.title") }}
        </h2>
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          square
          icon="i-tabler-x"
          :aria-label="t('shell.ai.close')"
          @click="setOpen(false)"
        />
      </div>
    </template>

    <AssistantPanel :company-id="selectedCompanyId" :case-id="caseId" @close="setOpen(false)" />
  </UDashboardSidebar>
</template>
