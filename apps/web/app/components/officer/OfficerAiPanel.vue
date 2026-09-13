<script setup lang="ts">
type UIMessageLike = { id: string; role: string; parts?: unknown };

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ "update:open": [boolean] }>();

const { t, locale } = useI18n();
const { current } = useOfficerAgency();
const { messages, error, isStreaming, send, reset, clearError } = useOfficerAssistant();

const input = ref("");
const lastQuestion = ref("");
const scrollArea = ref<HTMLElement | null>(null);

const hasMessages = computed(() => messages.value.length > 0);

function messageText(message: UIMessageLike): string {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  return parts
    .map((part) => {
      if (typeof part !== "object" || part === null) {
        return "";
      }
      const candidate = part as { type?: unknown; text?: unknown };
      return candidate.type === "text" && typeof candidate.text === "string" ? candidate.text : "";
    })
    .join("");
}

const visibleMessages = computed(() =>
  messages.value
    .map((message) => ({
      id: message.id,
      role: message.role,
      text: messageText(message as unknown as UIMessageLike),
    }))
    .filter((message) => message.text.trim().length > 0),
);

function roleLabel(role: string): string {
  return role === "user" ? t("officer.ai.you") : t("officer.ai.assistant");
}

const suggestions = computed(() => {
  const agency = current.value;
  const name = agency
    ? locale.value === "ar"
      ? agency.nameAr || agency.nameFr
      : agency.nameFr
    : null;
  return [
    { key: "overdue", label: t("officer.ai.suggestions.overdue") },
    { key: "deadlines", label: t("officer.ai.suggestions.deadlines") },
    {
      key: "situation",
      label: name
        ? t("officer.ai.suggestions.situation", { name })
        : t("officer.ai.suggestions.situationFallback"),
    },
    { key: "registry", label: t("officer.ai.suggestions.registry") },
  ];
});

async function sendPrompt(text: string) {
  const trimmed = text.trim();
  if (trimmed.length === 0 || isStreaming.value) {
    return;
  }
  lastQuestion.value = trimmed;
  input.value = "";
  await send(trimmed);
}

function close() {
  emit("update:open", false);
}

async function retry() {
  if (!lastQuestion.value) {
    return;
  }
  clearError();
  await send(lastQuestion.value);
}

const isComposing = ref(false);

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing || isComposing.value) {
    return;
  }
  event.preventDefault();
  void sendPrompt(input.value);
}

async function scrollToBottom() {
  await nextTick();
  const element = scrollArea.value;
  element?.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
}

watch([() => visibleMessages.value.length, isStreaming], () => {
  void scrollToBottom();
});

watch(
  () => props.open,
  (open) => {
    if (!open) {
      isComposing.value = false;
    }
  },
);
</script>

<template>
  <!--
    An in-flow `UDashboardPanel` (not an overlay) so that on `lg`+ the assistant
    takes horizontal space and pushes the main officer panel; below `lg` the
    wrapper becomes a full-screen sheet. Mirrors `shell/AppAiPanel.vue`.
    `lg:contents` keeps the wrapper inline in the `UDashboardGroup` flex row.
  -->
  <div
    v-if="open"
    class="max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:block max-lg:bg-default lg:contents"
  >
    <UDashboardPanel
      id="officer-ai"
      resizable
      :default-size="26"
      :min-size="22"
      :max-size="36"
      class="max-lg:h-full overflow-hidden border-s border-default max-lg:border-0"
      :ui="{
        body: 'flex min-h-0 flex-1 flex-col gap-0 overflow-hidden overflow-y-hidden p-0 sm:gap-0 sm:p-0',
        handle: 'max-lg:hidden',
      }"
    >
      <template #header>
        <UDashboardNavbar :toggle="false">
          <template #left>
            <div class="min-w-0">
              <p class="truncate text-base font-semibold text-highlighted">
                {{ t("officer.ai.title") }}
              </p>
              <p class="truncate text-sm text-muted">
                {{ t("officer.ai.subtitle") }}
              </p>
            </div>
          </template>

          <template #right>
            <UButton
              color="neutral"
              variant="ghost"
              size="md"
              icon="i-tabler-x"
              :label="t('officer.common.close')"
              class="shrink-0"
              @click="close"
            />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="flex min-h-0 flex-1 flex-col">
          <div class="px-4 py-3">
            <UAlert
              color="neutral"
              variant="subtle"
              icon="i-tabler-lock"
              :title="t('officer.ai.readOnly')"
            />
          </div>

          <div ref="scrollArea" class="min-h-0 flex-1 overflow-y-auto">
            <div v-if="!hasMessages" class="space-y-4 p-4">
              <p class="text-sm text-muted">
                {{ t("officer.ai.empty") }}
              </p>

              <div class="space-y-2">
                <p class="text-sm font-medium text-muted">
                  {{ t("officer.ai.suggestions.title") }}
                </p>
                <div class="flex flex-col gap-2">
                  <UButton
                    v-for="suggestion in suggestions"
                    :key="suggestion.key"
                    color="neutral"
                    variant="outline"
                    size="md"
                    block
                    icon="i-tabler-message-2"
                    class="justify-start text-start"
                    :label="suggestion.label"
                    @click="sendPrompt(suggestion.label)"
                  />
                </div>
              </div>
            </div>

            <div v-else class="divide-y divide-default">
              <div v-for="message in visibleMessages" :key="message.id" class="px-4 py-3">
                <p
                  class="text-xs font-semibold"
                  :class="message.role === 'user' ? 'text-muted' : 'text-primary'"
                >
                  {{ roleLabel(message.role) }}
                </p>
                <p
                  class="mt-1 whitespace-pre-line text-sm"
                  :class="message.role === 'user' ? 'text-default' : 'text-highlighted'"
                >
                  {{ message.text }}
                </p>
              </div>

              <div v-if="isStreaming" class="flex items-center gap-2 px-4 py-3 text-sm text-muted">
                <UIcon name="i-tabler-loader-2" class="size-4 shrink-0 animate-spin" />
                <span>{{ t("officer.ai.streaming") }}</span>
              </div>
            </div>
          </div>

          <div v-if="error" class="px-4 py-3">
            <UAlert
              color="error"
              variant="subtle"
              icon="i-tabler-alert-circle"
              :title="t('officer.ai.error')"
            >
              <template #actions>
                <UButton
                  color="error"
                  variant="subtle"
                  size="md"
                  icon="i-tabler-refresh"
                  :label="t('officer.ai.retry')"
                  @click="retry"
                />
              </template>
            </UAlert>
          </div>

          <form class="px-4 py-3" @submit.prevent="sendPrompt(input)">
            <div class="flex items-end gap-2">
              <UTextarea
                v-model="input"
                size="md"
                :rows="1"
                :maxrows="5"
                :autoresize="true"
                :disabled="isStreaming"
                :placeholder="t('officer.ai.placeholder')"
                class="min-w-0 flex-1"
                @keydown="onKeydown"
                @compositionstart="isComposing = true"
                @compositionend="isComposing = false"
              />

              <UButton
                type="submit"
                color="primary"
                size="md"
                icon="i-tabler-send"
                :label="t('officer.ai.send')"
                class="shrink-0"
                :disabled="isStreaming || !input.trim()"
              />
            </div>
          </form>
        </div>
      </template>
    </UDashboardPanel>
  </div>
</template>
