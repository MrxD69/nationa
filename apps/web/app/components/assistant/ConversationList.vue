<script setup lang="ts">
import type { AssistantConversation } from "~/composables/useAssistant";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

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

const confirmId = ref<string | null>(null);

function requestDelete(id: string) {
  confirmId.value = id;
}

function cancelDelete() {
  confirmId.value = null;
}

function confirmDelete() {
  if (!confirmId.value) {
    return;
  }
  emit("delete", confirmId.value);
  confirmId.value = null;
}

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
      <h2 class="text-base font-semibold text-highlighted">{{ t("assistant.conversations") }}</h2>
    </div>

    <LoadingState
      v-if="loading"
      variant="skeleton-rows"
      :count="3"
      :label="t('assistant.loading')"
    />

    <EmptyState
      v-else-if="conversations.length === 0"
      icon="i-tabler-messages"
      size="sm"
      :title="t('assistant.noConversations')"
    />

    <ul v-else class="min-h-0 flex-1 space-y-1 overflow-y-auto">
      <li v-for="conversation in conversations" :key="conversation.id">
        <div
          v-if="confirmId === conversation.id"
          class="rounded-md border border-error/40 bg-error/5 px-2 py-2"
        >
          <p class="text-sm text-error">{{ t("assistant.deleteConfirm") }}</p>
          <div class="mt-2 flex flex-wrap items-center justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :label="t('assistant.cancel')"
              @click="cancelDelete"
            />
            <UButton
              color="error"
              variant="soft"
              icon="i-tabler-trash"
              :label="t('assistant.delete')"
              @click="confirmDelete"
            />
          </div>
        </div>

        <div
          v-else
          class="group flex items-center gap-2 rounded-md px-2 py-2 transition-control"
          :class="conversation.id === activeId ? 'bg-primary/10' : 'hover-surface'"
        >
          <button
            type="button"
            class="min-w-0 flex-1 rounded-md text-start focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            @click="emit('select', conversation.id)"
          >
            <p class="truncate text-base text-highlighted">
              {{ conversation.title || t("assistant.newConversation") }}
            </p>
            <p class="text-sm text-muted">{{ formatDate(conversation.updatedAt) }}</p>
          </button>

          <UButton
            color="neutral"
            variant="ghost"
            square
            icon="i-tabler-trash"
            class="reveal-on-hover shrink-0"
            :aria-label="t('assistant.delete')"
            @click="requestDelete(conversation.id)"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
