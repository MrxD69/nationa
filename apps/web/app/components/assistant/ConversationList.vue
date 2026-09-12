<script setup lang="ts">
import type { AssistantConversation } from "~/composables/useAssistant";

defineProps<{
  conversations: AssistantConversation[];
  activeId?: string | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  select: [id: string];
  new: [];
  delete: [id: string];
}>();

const { t } = useI18n();

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString();
}
</script>

<template>
  <div class="flex min-h-0 flex-col">
    <div class="flex items-center justify-between gap-2 pb-2">
      <h2 class="text-sm font-semibold text-highlighted">{{ t("assistant.conversations") }}</h2>
      <UButton
        color="primary"
        variant="soft"
        size="xs"
        icon="i-tabler-plus"
        :label="t('assistant.newConversation')"
        @click="emit('new')"
      />
    </div>

    <div v-if="loading" class="flex items-center gap-2 py-4 text-xs text-muted">
      <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
      {{ t("assistant.loading") }}
    </div>

    <div
      v-else-if="conversations.length === 0"
      class="rounded-xl border border-dashed border-default p-4 text-center text-xs text-muted"
    >
      {{ t("assistant.noConversations") }}
    </div>

    <ul v-else class="min-h-0 flex-1 space-y-1 overflow-y-auto">
      <li v-for="conversation in conversations" :key="conversation.id">
        <div
          class="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors"
          :class="conversation.id === activeId ? 'bg-primary/10' : 'hover:bg-elevated'"
        >
          <button
            type="button"
            class="min-w-0 flex-1 text-start"
            @click="emit('select', conversation.id)"
          >
            <p class="truncate text-sm text-highlighted">
              {{ conversation.title || t("assistant.newConversation") }}
            </p>
            <p class="text-[11px] text-muted">{{ formatDate(conversation.updatedAt) }}</p>
          </button>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-tabler-trash"
            :aria-label="t('assistant.delete')"
            class="opacity-0 group-hover:opacity-100"
            @click="emit('delete', conversation.id)"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
