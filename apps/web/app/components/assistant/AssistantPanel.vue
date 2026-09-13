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

async function handleSubmit() {
  const text = input.value;
  input.value = "";
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
  <div class="flex h-full min-h-0 flex-1 flex-col">
    <div class="flex shrink-0 items-center gap-1.5 border-b border-default px-3 py-2">
      <UPopover :content="{ align: 'start' }">
        <UButton
          color="neutral"
          variant="ghost"
          size="lg"
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
        size="lg"
        square
        icon="i-tabler-plus"
        :aria-label="t('assistant.newConversation')"
        @click="onNewConversation"
      />

      <UButton
        color="neutral"
        variant="ghost"
        size="lg"
        square
        icon="i-tabler-x"
        :aria-label="t('shell.ai.close')"
        @click="emit('close')"
      />
    </div>

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <div v-if="!hasMessages" class="flex h-full items-center justify-center py-10">
        <div class="max-w-md space-y-2 text-center">
          <div class="mx-auto flex size-10 items-center justify-center rounded-full bg-elevated">
            <UIcon name="i-tabler-sparkles" class="size-5 text-muted" />
          </div>
          <h2 class="text-base font-semibold text-highlighted">
            {{ t("assistant.emptyTitle") }}
          </h2>
          <p class="text-base text-muted">{{ t("assistant.emptySubtitle") }}</p>
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

    <div class="shrink-0 border-t border-default p-3">
      <UChatPrompt
        v-model="input"
        icon="i-tabler-sparkles"
        variant="soft"
        :rows="1"
        :maxrows="8"
        :loading="isStreaming"
        :error="error"
        :placeholder="t('assistant.placeholder')"
        @submit="handleSubmit"
      >
        <UChatPromptSubmit
          class="ms-auto"
          :status="status"
          @stop="stop"
          @reload="() => regenerate()"
        />
      </UChatPrompt>
      <p class="mt-2 text-sm text-muted">{{ t("assistant.disclaimer") }}</p>
    </div>
  </div>
</template>
