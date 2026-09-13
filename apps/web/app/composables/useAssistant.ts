import { useChat } from "@ai-sdk/vue";
import { DefaultChatTransport, type UIMessage } from "ai";
import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";

export type AssistantConversation = {
  id: string;
  title?: string | null;
  companyId?: string | null;
  caseId?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type AssistantCitation = {
  id: string;
  messageId?: string | null;
  rule?: {
    id: string;
    source: string;
    article?: string | null;
    titleFr?: string | null;
    titleAr?: string | null;
    textFr?: string | null;
    textAr?: string | null;
    url?: string | null;
  } | null;
};

export type AssistantProposal = {
  id: string;
  conversationId?: string | null;
  messageId?: string | null;
  subjectType: string;
  subjectId: string;
  kind: string;
  status: string;
  payload?: unknown;
  rationale?: string | null;
};

export type AssistantConversationDetail = {
  conversation: AssistantConversation;
  messages: Array<{ id: string; role: string; content: string; parts: unknown }>;
  citations: AssistantCitation[];
  proposals: AssistantProposal[];
};

export function useAssistant(
  options: {
    companyId?: MaybeRefOrGetter<string | null | undefined>;
    caseId?: MaybeRefOrGetter<string | null | undefined>;
    stepId?: MaybeRefOrGetter<string | null | undefined>;
    docgenProposalId?: MaybeRefOrGetter<string | null | undefined>;
    initialConversationId?: string | null;
  } = {},
) {
  const client = useApi();
  const config = useRuntimeConfig();
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const { locale } = useI18n();

  const conversationId = ref<string | null>(options.initialConversationId ?? null);
  const companyId = computed(() => toValue(options.companyId) ?? null);
  const caseId = computed(() => toValue(options.caseId) ?? null);
  const stepId = computed(() => toValue(options.stepId) ?? null);
  const docgenProposalId = computed(() => toValue(options.docgenProposalId) ?? null);

  async function resolveAccessToken(): Promise<string | null> {
    if (session.value?.access_token) {
      return session.value.access_token;
    }
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  const transport = new DefaultChatTransport({
    api: `${(config.public.serverUrl as string | undefined) ?? ""}/assistant/chat`,
    headers: async (): Promise<Record<string, string>> => {
      const token = await resolveAccessToken();
      return token ? { authorization: `Bearer ${token}` } : {};
    },
    body: () => ({
      conversationId: conversationId.value,
      companyId: companyId.value,
      caseId: caseId.value,
      stepId: stepId.value,
      docgenProposalId: docgenProposalId.value,
      locale: locale.value,
    }),
  });

  const chat = useChat({
    transport,
    onError(error: Error) {
      console.error("Assistant error:", error);
    },
  });

  const messages = chat.messages;
  const status = chat.status;
  const error = chat.error;
  const isStreaming = computed(() => status.value === "submitted" || status.value === "streaming");

  function toolStateOf(part: unknown): string | null {
    if (typeof part !== "object" || part === null || !("type" in part)) {
      return null;
    }
    const type = part.type;
    if (typeof type !== "string") {
      return null;
    }
    if (!type.startsWith("tool-") && type !== "dynamic-tool") {
      return null;
    }
    if (!("state" in part)) {
      return "input-available";
    }
    return typeof part.state === "string" ? part.state : "input-available";
  }

  const lastAssistantMessage = computed(() => {
    const all = messages.value;
    for (let index = all.length - 1; index >= 0; index--) {
      const message = all[index];
      if (message?.role === "assistant") {
        return message;
      }
    }
    return null;
  });

  const activeToolCount = computed(() => {
    const message = lastAssistantMessage.value;
    if (!message || !Array.isArray(message.parts)) {
      return 0;
    }
    let count = 0;
    for (const part of message.parts) {
      const state = toolStateOf(part);
      if (state !== null && state !== "output-available" && state !== "output-error") {
        count += 1;
      }
    }
    return count;
  });

  const hasStreamError = computed(() => {
    if (error.value != null) {
      return true;
    }
    const message = lastAssistantMessage.value;
    if (!message || !Array.isArray(message.parts)) {
      return false;
    }
    return message.parts.some((part) => toolStateOf(part) === "output-error");
  });

  function clearError() {
    chat.clearError();
  }

  async function ensureConversation(): Promise<string> {
    if (conversationId.value) {
      return conversationId.value;
    }
    const created = (await client.ai.createConversation({
      companyId: companyId.value ?? undefined,
      caseId: caseId.value ?? undefined,
    })) as unknown as AssistantConversation;
    conversationId.value = created.id;
    return created.id;
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (trimmed.length === 0 || isStreaming.value) {
      return;
    }
    await ensureConversation();
    await chat.sendMessage({ text: trimmed });
  }

  function newConversation() {
    conversationId.value = null;
    chat.messages.value = [];
    chat.clearError();
  }

  async function loadConversation(id: string): Promise<AssistantConversationDetail | null> {
    const detail = (await client.ai.getConversation({
      conversationId: id,
    })) as unknown as AssistantConversationDetail;
    conversationId.value = id;
    chat.messages.value = detail.messages.map((message) => ({
      id: message.id,
      role: message.role as UIMessage["role"],
      parts: message.parts as UIMessage["parts"],
    }));
    return detail;
  }

  async function acceptProposal(proposalId: string) {
    if (!companyId.value) {
      throw new Error("A company context is required to accept a proposal");
    }
    return client.ai.acceptProposal({ companyId: companyId.value, proposalId });
  }

  async function rejectProposal(proposalId: string, reason?: string) {
    if (!companyId.value) {
      throw new Error("A company context is required to reject a proposal");
    }
    return client.ai.rejectProposal({ companyId: companyId.value, proposalId, reason });
  }

  return {
    conversationId,
    companyId,
    caseId,
    messages,
    status,
    error,
    isStreaming,
    activeToolCount,
    hasStreamError,
    send,
    stop: chat.stop,
    regenerate: chat.regenerate,
    clearError,
    newConversation,
    loadConversation,
    acceptProposal,
    rejectProposal,
  };
}
