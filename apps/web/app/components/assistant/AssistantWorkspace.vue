<script setup lang="ts">
import type { AssistantConversation, AssistantProposal } from "~/composables/useAssistant";
import AssistantMessage from "~/components/assistant/AssistantMessage.vue";
import ConversationList from "~/components/assistant/ConversationList.vue";

const route = useRoute();
const router = useRouter();
const client = useApi();
const { t } = useI18n();

const selectedCompanyId = ref<string | null>(
  typeof route.query.companyId === "string" ? route.query.companyId : null,
);
const companies = ref<Array<{ id: string; legalName: string; tradeName?: string | null }>>([]);
const caseId = computed(() => (typeof route.query.caseId === "string" ? route.query.caseId : null));

const companyOptions = computed(() =>
  companies.value.map((company) => ({
    label: company.tradeName || company.legalName,
    value: company.id,
  })),
);
const selectedCompanyName = computed(
  () =>
    companyOptions.value.find((option) => option.value === selectedCompanyId.value)?.label ?? null,
);

const companySelect = computed({
  get: () => selectedCompanyId.value ?? undefined,
  set: (value: string | undefined) => {
    void onCompanyChange(value ?? null);
  },
});

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
} = useAssistant({ companyId: selectedCompanyId, caseId });

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
const canResolve = computed(() => Boolean(selectedCompanyId.value));
const activeConversation = computed(
  () => conversations.value.find((item) => item.id === conversationId.value) ?? null,
);

async function loadConversations() {
  conversationsLoading.value = true;
  try {
    conversations.value = (await client.ai.listConversations({
      companyId: selectedCompanyId.value ?? undefined,
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
  }
  wasStreaming = streaming;
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

async function onSelectConversation(id: string) {
  try {
    const detail = await loadConversation(id);
    proposals.value = (detail?.proposals as unknown as AssistantProposal[]) ?? [];
    await router.replace({ query: { ...route.query, conversation: id } });
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
  void router.replace({ query: { ...route.query, conversation: undefined } });
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
    proposals.value[index] = { ...proposals.value[index], status: nextStatus };
    return;
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

async function loadCompanies() {
  try {
    companies.value = (await client.companies.list({})) as unknown as typeof companies.value;
  } catch {
    companies.value = [];
  }
}

async function onCompanyChange(value?: string | null) {
  selectedCompanyId.value = value || null;
  onNewConversation();
  await router.replace({
    query: {
      ...route.query,
      companyId: selectedCompanyId.value ?? undefined,
      conversation: undefined,
    },
  });
  await loadConversations();
}

onMounted(async () => {
  await loadCompanies();
  await loadConversations();
  const queryConversation =
    typeof route.query.conversation === "string" ? route.query.conversation : null;
  if (queryConversation) {
    await onSelectConversation(queryConversation);
  }
});
</script>

<template>
  <UContainer class="max-w-6xl py-6">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <aside class="hidden lg:block">
        <div class="sticky top-6 rounded-xl border border-default p-3">
          <ConversationList
            :conversations="conversations"
            :active-id="conversationId"
            :loading="conversationsLoading"
            @select="onSelectConversation"
            @new="onNewConversation"
            @delete="onDeleteConversation"
          />
        </div>
      </aside>

      <section class="flex min-h-0 flex-col">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <h1 class="text-xl font-semibold tracking-tight text-highlighted">
              {{ t("assistant.title") }}
            </h1>
            <p class="text-sm text-muted">
              {{ activeConversation?.title || t("assistant.subtitle") }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <USelect
              v-if="companyOptions.length > 0"
              v-model="companySelect"
              :items="companyOptions"
              placeholder="—"
              size="sm"
              class="min-w-44"
            />
            <UBadge
              v-if="selectedCompanyName"
              color="neutral"
              variant="subtle"
              :label="selectedCompanyName"
            />
          </div>
        </div>

        <div class="mt-4 flex min-h-0 flex-1 flex-col rounded-xl border border-default">
          <div class="min-h-[45vh] flex-1 space-y-4 overflow-y-auto p-4">
            <div v-if="!hasMessages" class="flex h-full items-center justify-center py-10">
              <div class="max-w-md space-y-2 text-center">
                <div
                  class="mx-auto flex size-10 items-center justify-center rounded-full bg-elevated"
                >
                  <UIcon name="i-tabler-sparkles" class="size-5 text-muted" />
                </div>
                <h2 class="text-base font-semibold text-highlighted">
                  {{ t("assistant.emptyTitle") }}
                </h2>
                <p class="text-sm text-muted">{{ t("assistant.emptySubtitle") }}</p>
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
            />

            <div v-if="status === 'submitted'" class="flex items-center gap-2 text-xs text-muted">
              <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
              {{ t("assistant.thinking") }}
            </div>
          </div>

          <div class="border-t border-default p-4">
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
            <p class="mt-2 text-[11px] text-muted">{{ t("assistant.disclaimer") }}</p>
          </div>
        </div>
      </section>
    </div>
  </UContainer>
</template>
