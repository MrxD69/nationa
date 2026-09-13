import { useChat } from "@ai-sdk/vue";
import { DefaultChatTransport } from "ai";
import { computed } from "vue";

/**
 * Officer back-office assistant.
 *
 * Mirrors `useAssistant`'s transport but targets `/assistant/officer/chat`. The
 * selected agency is forwarded as `organizationId` only for ministry agents
 * (`admin` accounts with oversight across organisations); a regular officer is
 * always scoped to their own agency by the API session.
 *
 * The assistant is consult-only: there is no conversation persistence here.
 */
export function useOfficerAssistant() {
  const config = useRuntimeConfig();
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const { locale } = useI18n();
  const { agencyId, isMinistryAgent } = useOfficerAgency();

  const organizationId = computed<string | null>(() =>
    isMinistryAgent.value ? (agencyId.value ?? null) : null,
  );

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
    api: `${(config.public.serverUrl as string | undefined) ?? ""}/assistant/officer/chat`,
    headers: async (): Promise<Record<string, string>> => {
      const token = await resolveAccessToken();
      return token ? { authorization: `Bearer ${token}` } : {};
    },
    body: () => ({
      organizationId: organizationId.value ?? undefined,
      locale: locale.value,
    }),
  });

  const chat = useChat({
    transport,
    onError(error: Error) {
      console.error("Officer assistant error:", error);
    },
  });

  const messages = chat.messages;
  const status = chat.status;
  const error = chat.error;
  const isStreaming = computed(() => status.value === "submitted" || status.value === "streaming");

  async function send(text: string) {
    const trimmed = text.trim();
    if (trimmed.length === 0 || isStreaming.value) {
      return;
    }
    await chat.sendMessage({ text: trimmed });
  }

  function reset() {
    chat.messages.value = [];
    chat.clearError();
  }

  return {
    messages,
    status,
    error,
    isStreaming,
    organizationId,
    send,
    reset,
    clearError: chat.clearError,
    stop: chat.stop,
  };
}
