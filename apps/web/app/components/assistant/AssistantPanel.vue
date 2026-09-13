<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";

import type { AssistantConversation, AssistantProposal } from "~/composables/useAssistant";
import AssistantMessage from "~/components/assistant/AssistantMessage.vue";
import ConversationList from "~/components/assistant/ConversationList.vue";

const props = defineProps<{
  companyId?: string | null;
  caseId?: string | null;
  stepId?: string | null;
  docgenProposalId?: string | null;
}>();

const emit = defineEmits<{ close: [] }>();

const client = useApi();
const { t } = useI18n();
const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();
const { pendingTurn, consumePendingTurn } = useAssistantContext();

const {
  conversationId,
  messages,
  status,
  error,
  isStreaming,
  send,
  stop,
  regenerate,
  newConversation,
  loadConversation,
  acceptProposal,
  rejectProposal,
} = useAssistant({
  companyId: () => props.companyId ?? null,
  caseId: () => props.caseId ?? null,
  stepId: () => props.stepId ?? null,
  docgenProposalId: () => props.docgenProposalId ?? null,
});

const input = ref("");
const conversations = ref<AssistantConversation[]>([]);
const proposals = ref<AssistantProposal[]>([]);
const conversationsLoading = ref(false);
const pendingProposalId = ref<string | null>(null);
const toast = useToast();

const proposalsById = computed<Record<string, AssistantProposal>>(() => {
  const map: Record<string, AssistantProposal> = {};
  for (const proposal of proposals.value) {
    map[proposal.id] = proposal;
  }
  return map;
});

const hasMessages = computed(() => messages.value.length > 0);
const canResolve = computed(() => Boolean(props.companyId));
const activeConversation = computed(
  () => conversations.value.find((item) => item.id === conversationId.value) ?? null,
);

const scrollArea = ref<HTMLElement | null>(null);
const atBottom = ref(true);
const showJumpToLatest = computed(() => hasMessages.value && !atBottom.value);
const suggestionKeys = [
  "assistant.suggestions.q1",
  "assistant.suggestions.q2",
  "assistant.suggestions.q3",
];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

async function scrollToBottom() {
  await nextTick();
  const element = scrollArea.value;
  if (!element) {
    return;
  }
  element.scrollTo({
    top: element.scrollHeight,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

function updateAtBottom() {
  const element = scrollArea.value;
  if (!element) {
    return;
  }
  atBottom.value = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
}

watch([() => messages.value.length, status], async () => {
  await nextTick();
  await scrollToBottom();
});

async function loadConversations() {
  conversationsLoading.value = true;
  try {
    conversations.value = (await client.ai.listConversations({
      companyId: props.companyId ?? undefined,
    })) as unknown as AssistantConversation[];
  } catch {
    conversations.value = [];
  } finally {
    conversationsLoading.value = false;
  }
}

async function refreshMeta() {
  if (!conversationId.value) {
    return;
  }
  try {
    const detail = await client.ai.getConversation({ conversationId: conversationId.value });
    proposals.value = detail.proposals as unknown as AssistantProposal[];
  } catch {
    return;
  }
}

let wasStreaming = false;
watch(status, async (value) => {
  const streaming = value === "submitted" || value === "streaming";
  if (wasStreaming && !streaming && value === "ready") {
    await refreshMeta();
    await loadConversations();
    if (props.docgenProposalId) {
      await queryClient.invalidateQueries({
        queryKey: $orpc.docgen.getDraft.queryKey({
          input: { proposalId: props.docgenProposalId },
        }),
      });
    }
  }
  wasStreaming = streaming;
});

let handlingHandoff = false;
watch(
  pendingTurn,
  async (value) => {
    if (!value || handlingHandoff) {
      return;
    }
    handlingHandoff = true;
    try {
      const text = consumePendingTurn();
      if (text) {
        await send(text);
      }
    } finally {
      handlingHandoff = false;
    }
  },
  { immediate: true },
);

watch([() => props.companyId, () => props.caseId], async () => {
  newConversation();
  proposals.value = [];
  await loadConversations();
});

async function sendPrompt(text: string) {
  if (!text.trim()) {
    return;
  }
  try {
    await send(text);
  } catch (caught) {
    toast.add({
      title: t("assistant.errors.sendFailed"),
      description: caught instanceof Error ? caught.message : undefined,
      color: "error",
    });
  }
}

async function handleSubmit() {
  const text = input.value;
  input.value = "";
  await sendPrompt(text);
}

const isComposing = ref(false);
let compositionGuardUntil = 0;

function onCompositionStart() {
  isComposing.value = true;
}

function onCompositionEnd() {
  isComposing.value = false;
  compositionGuardUntil = Date.now() + 50;
}

function onComposerKeydown(event: KeyboardEvent) {
  if (event.key !== "Enter") {
    return;
  }
  if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (
    isComposing.value ||
    Date.now() < compositionGuardUntil ||
    event.isComposing ||
    event.keyCode === 229
  ) {
    return;
  }
  event.preventDefault();
  void handleSubmit();
}

async function onClarification(
  answers: Array<{ questionId: string; question: string; value: string }>,
) {
  if (answers.length === 0) {
    return;
  }
  const text = answers
    .map((answer) => `Question: ${answer.question}\nAnswer: ${answer.value}`)
    .join("\n\n");
  try {
    await send(text);
  } catch (caught) {
    toast.add({
      title: t("assistant.errors.sendFailed"),
      description: caught instanceof Error ? caught.message : undefined,
      color: "error",
    });
  }
}

async function onSelectConversation(id: string) {
  try {
    const detail = await loadConversation(id);
    proposals.value = (detail?.proposals as unknown as AssistantProposal[]) ?? [];
  } catch (caught) {
    toast.add({
      title: t("assistant.errors.loadFailed"),
      description: caught instanceof Error ? caught.message : undefined,
      color: "error",
    });
  }
}

function onNewConversation() {
  newConversation();
  proposals.value = [];
}

async function onDeleteConversation(id: string) {
  try {
    await client.ai.deleteConversation({ conversationId: id });
    conversations.value = conversations.value.filter((item) => item.id !== id);
    if (conversationId.value === id) {
      onNewConversation();
    }
  } catch {
    return;
  }
}

function setProposalStatus(id: string, nextStatus: string) {
  const index = proposals.value.findIndex((proposal) => proposal.id === id);
  if (index >= 0) {
    const current = proposals.value[index];
    if (current) {
      proposals.value[index] = { ...current, status: nextStatus };
      return;
    }
  }
  proposals.value = [
    ...proposals.value,
    { id, subjectType: "case", subjectId: "", kind: "case_field_fills", status: nextStatus },
  ];
}

async function onAcceptProposal(id: string) {
  if (!id) {
    return;
  }
  pendingProposalId.value = id;
  try {
    await acceptProposal(id);
    setProposalStatus(id, "accepted");
    toast.add({ title: t("assistant.proposal.acceptedToast"), color: "success" });
  } catch (caught) {
    toast.add({
      title: t("assistant.errors.acceptFailed"),
      description: caught instanceof Error ? caught.message : undefined,
      color: "error",
    });
  } finally {
    pendingProposalId.value = null;
  }
}

async function onRejectProposal(id: string) {
  if (!id) {
    return;
  }
  pendingProposalId.value = id;
  try {
    await rejectProposal(id);
    setProposalStatus(id, "rejected");
    toast.add({ title: t("assistant.proposal.rejectedToast"), color: "neutral" });
  } catch (caught) {
    toast.add({
      title: t("assistant.errors.rejectFailed"),
      description: caught instanceof Error ? caught.message : undefined,
      color: "error",
    });
  } finally {
    pendingProposalId.value = null;
  }
}

function messageFor(message: { id: string; role: string; parts?: unknown }) {
  return {
    id: message.id,
    role: message.role,
    parts: Array.isArray(message.parts) ? message.parts : [],
  };
}

onMounted(() => {
  void loadConversations();
});
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-1 flex-col">
    <div class="shrink-0 border-b border-default">
      <div class="flex items-center gap-1.5 px-3 py-2">
        <UPopover :content="{ align: 'start' }">
          <UButton
            color="neutral"
            variant="ghost"
            class="min-w-0 flex-1 justify-start"
            :aria-label="t('assistant.conversations')"
          >
            <UIcon name="i-tabler-messages" class="size-4 shrink-0" />
            <span class="min-w-0 truncate">
              {{ activeConversation?.title || t("assistant.conversations") }}
            </span>
            <UIcon name="i-tabler-chevron-down" class="ms-auto size-4 shrink-0" />
          </UButton>

          <template #content="{ close: closeConversations }">
            <div class="flex max-h-80 w-72 max-w-[80vw] flex-col p-2">
              <ConversationList
                :conversations="conversations"
                :active-id="conversationId"
                :loading="conversationsLoading"
                @select="
                  (id) => {
                    void onSelectConversation(id);
                    closeConversations?.();
                  }
                "
                @new="
                  () => {
                    onNewConversation();
                    closeConversations?.();
                  }
                "
                @delete="onDeleteConversation"
              />
            </div>
          </template>
        </UPopover>

        <UButton
          color="primary"
          variant="soft"
          square
          icon="i-tabler-plus"
          :aria-label="t('assistant.newConversation')"
          @click="onNewConversation"
        />

        <UButton
          color="neutral"
          variant="ghost"
          square
          icon="i-tabler-x"
          :aria-label="t('shell.ai.close')"
          @click="emit('close')"
        />
      </div>
    </div>

    <div
      ref="scrollArea"
      class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
      @scroll.passive="updateAtBottom"
    >
      <div v-if="!hasMessages" class="flex h-full flex-col items-center justify-center gap-4 py-10">
        <div class="max-w-md space-y-2 text-center">
          <div class="mx-auto flex size-10 items-center justify-center rounded-full bg-accented">
            <UIcon name="i-tabler-sparkles" class="size-5 text-muted" />
          </div>
          <h2 class="text-base font-semibold text-highlighted">
            {{ t("assistant.emptyTitle") }}
          </h2>
          <p class="text-base text-muted">{{ t("assistant.emptySubtitle") }}</p>
        </div>

        <div class="w-full max-w-md space-y-2">
          <p class="text-center text-sm font-medium text-muted">
            {{ t("assistant.suggestions.title") }}
          </p>
          <div class="flex flex-col gap-2">
            <UButton
              v-for="key in suggestionKeys"
              :key="key"
              color="neutral"
              variant="soft"
              icon="i-tabler-message-2"
              class="press justify-start rounded-lg text-start"
              :label="t(key)"
              @click="sendPrompt(t(key))"
            />
          </div>
        </div>
      </div>

      <AssistantMessage
        v-for="message in messages"
        :key="message.id"
        :message="messageFor(message)"
        :proposals-by-id="proposalsById"
        :can-resolve="canResolve"
        :pending-proposal-id="pendingProposalId"
        @accept="onAcceptProposal"
        @reject="onRejectProposal"
        @clarification="onClarification"
      />

      <div v-if="status === 'submitted'" class="flex items-center gap-2 text-sm text-muted">
        <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
        {{ t("assistant.thinking") }}
      </div>
    </div>

    <UButton
      v-if="showJumpToLatest"
      color="primary"
      square
      icon="i-tabler-arrow-down"
      class="absolute end-4 bottom-24 z-10 shadow-lg transition-control"
      :aria-label="t('assistant.jumpToLatest')"
      @click="scrollToBottom"
    />

    <div class="shrink-0 border-t border-default">
      <div v-if="error" class="px-3 pt-2">
        <UAlert
          color="error"
          variant="soft"
          icon="i-tabler-alert-circle"
          class="mb-2 rounded-lg"
          :title="t('assistant.errors.sendFailed')"
          :description="error.message"
        >
          <template #actions>
            <UButton
              color="error"
              variant="soft"
              icon="i-tabler-refresh"
              :label="t('assistant.retry')"
              @click="() => regenerate()"
            />
          </template>
        </UAlert>
      </div>

      <form
        class="flex items-end gap-2 border-0 bg-transparent px-3 pe-3 ps-4 pt-2 pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
        @submit.prevent="handleSubmit"
      >
        <UTextarea
          v-model="input"
          size="md"
          variant="none"
          :rows="1"
          :maxrows="6"
          :autoresize="true"
          :disabled="isStreaming"
          :placeholder="t('assistant.placeholder')"
          class="min-w-0 flex-1"
          :ui="{
            base: 'bg-transparent border-0 shadow-none px-0 py-2.5 min-h-11 text-base leading-6 focus:ring-0',
          }"
          @keydown="onComposerKeydown"
          @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd"
        />

        <UButton
          v-if="isStreaming"
          color="neutral"
          variant="soft"
          size="md"
          square
          icon="i-tabler-player-stop"
          class="press mb-0.5 size-11 shrink-0 self-end rounded-full"
          :aria-label="t('assistant.stop')"
          @click="stop"
        />
        <UButton
          v-else
          type="submit"
          color="primary"
          size="md"
          square
          icon="i-tabler-arrow-up"
          class="press mb-0.5 size-11 shrink-0 self-end rounded-full"
          :disabled="!input.trim() || isStreaming"
          :aria-label="t('assistant.send')"
        />
      </form>
      <p class="truncate px-3 pb-2 text-xs text-muted">
        {{ t("assistant.composerHint") }}
      </p>
    </div>
  </div>
</template>
