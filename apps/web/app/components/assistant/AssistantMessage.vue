<script setup lang="ts">
import type { AssistantProposal } from "~/composables/useAssistant";
import AssistantMarkdown from "~/components/assistant/AssistantMarkdown.vue";
import CitationCard from "~/components/assistant/CitationCard.vue";
import ClarificationCard from "~/components/assistant/ClarificationCard.vue";
import DelicacyAlert from "~/components/assistant/DelicacyAlert.vue";
import ProposalCard from "~/components/assistant/ProposalCard.vue";
import ToolCallCard from "~/components/assistant/ToolCallCard.vue";
import ToolProgress from "~/components/assistant/ToolProgress.vue";

const props = defineProps<{
  message: { id: string; role: string; parts: unknown[] };
  proposalsById: Record<string, AssistantProposal>;
  canResolve?: boolean;
  pendingProposalId?: string | null;
}>();

const emit = defineEmits<{
  accept: [id: string];
  reject: [id: string];
  clarification: [answers: Array<{ questionId: string; question: string; value: string }>];
}>();

const parts = computed(() => (props.message.parts ?? []) as any[]);
const isUser = computed(() => props.message.role === "user");
const textParts = computed(() => parts.value.filter((part) => part?.type === "text"));
const fullText = computed(() =>
  textParts.value.map((part) => String(part?.text ?? "")).join("\n\n"),
);

function toolName(part: any): string {
  if (part.type === "dynamic-tool") {
    return String(part.toolName ?? "tool");
  }
  return String(part.type ?? "").replace(/^tool-/, "");
}

function isTool(part: any): boolean {
  return (
    typeof part?.type === "string" &&
    (part.type.startsWith("tool-") || part.type === "dynamic-tool")
  );
}

function toolOutput(part: any): any {
  return part.output ?? part.result ?? null;
}

function isErrorPart(part: any): boolean {
  return isTool(part) && part.state === "output-error";
}

function isPendingPart(part: any): boolean {
  return isTool(part) && part.state !== "output-available" && part.state !== "output-error";
}

const pendingTools = computed(() => parts.value.filter((part) => isPendingPart(part)));
const errorTools = computed(() => parts.value.filter((part) => isErrorPart(part)));
const firstPending = computed(() => pendingTools.value[0] ?? null);

const visibleCardParts = computed(() =>
  parts.value.filter((part) => {
    if (part?.type === "data-citation") {
      return Boolean(part.data);
    }
    if (isTool(part)) {
      return part.state === "output-available" || Boolean(toolOutput(part));
    }
    return false;
  }),
);

function proposalFor(part: any) {
  const output = toolOutput(part) ?? {};
  const id: string | null = output.proposalId ?? output.id ?? null;
  const dbProposal = id ? props.proposalsById[id] : undefined;
  const payload = dbProposal?.payload as any;
  const rawFields = payload?.fields ?? output.fields ?? [];
  const fields = (Array.isArray(rawFields) ? rawFields : []).map((field: any) =>
    typeof field === "string" ? { fieldKey: field } : field,
  );
  return {
    id,
    status: dbProposal?.status ?? output.status ?? null,
    fields,
    rationale: dbProposal?.rationale ?? output.rationale ?? output.note ?? null,
    pending: Boolean(id && id === props.pendingProposalId),
  };
}
</script>

<template>
  <div class="flex flex-col gap-2" :class="isUser ? 'items-end' : 'items-start'">
    <div v-if="isUser && fullText" class="max-w-full rounded-lg bg-primary px-4 py-3 text-inverted">
      <p class="whitespace-pre-wrap text-base leading-6" dir="auto">
        {{ fullText }}
      </p>
    </div>

    <div v-else-if="!isUser" class="w-full max-w-full">
      <AssistantMarkdown v-if="fullText" :text="fullText" />

      <div v-if="visibleCardParts.length" class="mt-2 space-y-2">
        <template v-for="(part, index) in visibleCardParts" :key="`card-${index}`">
          <CitationCard
            v-if="
              isTool(part) &&
              toolName(part) === 'citeRule' &&
              toolOutput(part) &&
              !toolOutput(part).error
            "
            :rule="toolOutput(part)"
          />
          <ProposalCard
            v-else-if="
              isTool(part) && toolName(part) === 'proposeCaseFieldFills' && toolOutput(part)
            "
            :proposal-id="proposalFor(part).id ?? ''"
            :status="proposalFor(part).status"
            :fields="proposalFor(part).fields"
            :rationale="proposalFor(part).rationale"
            :pending="proposalFor(part).pending"
            :can-resolve="canResolve"
            @accept="emit('accept', $event)"
            @reject="emit('reject', $event)"
          />
          <ClarificationCard
            v-else-if="
              isTool(part) &&
              toolName(part) === 'requestClarification' &&
              toolOutput(part)?.questions
            "
            :questions="toolOutput(part).questions"
            @submit="emit('clarification', $event)"
          />
          <DelicacyAlert
            v-else-if="
              isTool(part) && toolName(part) === 'flagDelicateMatter' && toolOutput(part)?.summary
            "
            :summary="toolOutput(part).summary"
            :severity="toolOutput(part).severity"
            :reasons="toolOutput(part).reasons"
          />
          <CitationCard
            v-else-if="part.type === 'data-citation' && part.data"
            :rule="part.data"
            :snippet="part.data.snippet"
          />
        </template>
      </div>

      <ToolProgress
        v-if="firstPending"
        class="mt-2"
        :name="toolName(firstPending)"
        :state="firstPending.state"
        :input="firstPending.input"
      />

      <div v-if="errorTools.length" class="mt-2 space-y-2">
        <ToolCallCard
          v-for="(part, index) in errorTools"
          :key="`tool-error-${index}`"
          :name="toolName(part)"
          :state="part.state"
          :input="part.input"
          :output="toolOutput(part)"
          :error-text="part.errorText ?? null"
        />
      </div>
    </div>
  </div>
</template>
