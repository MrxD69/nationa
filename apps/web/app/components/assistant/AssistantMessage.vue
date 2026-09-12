<script setup lang="ts">
import type { AssistantProposal } from "~/composables/useAssistant";
import CitationCard from "~/components/assistant/CitationCard.vue";
import ClarificationCard from "~/components/assistant/ClarificationCard.vue";
import DelicacyAlert from "~/components/assistant/DelicacyAlert.vue";
import ProposalCard from "~/components/assistant/ProposalCard.vue";
import ToolCallCard from "~/components/assistant/ToolCallCard.vue";

const props = defineProps<{
  message: { id: string; role: string; parts: unknown[] };
  proposalsById: Record<string, AssistantProposal>;
  canResolve?: boolean;
  pendingProposalId?: string | null;
}>();

const emit = defineEmits<{ accept: [id: string]; reject: [id: string] }>();

const parts = computed(() => (props.message.parts ?? []) as any[]);
const isUser = computed(() => props.message.role === "user");

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
    <div
      class="max-w-full space-y-2 rounded-2xl px-4 py-3"
      :class="isUser ? 'bg-primary text-inverted' : 'bg-elevated text-highlighted'"
    >
      <template v-for="(part, index) in parts" :key="index">
        <p v-if="part.type === 'text'" class="whitespace-pre-wrap text-sm leading-6">
          {{ part.text }}
        </p>

        <template v-else-if="isTool(part)">
          <CitationCard
            v-if="toolName(part) === 'citeRule' && toolOutput(part) && !toolOutput(part).error"
            :rule="toolOutput(part)"
          />
          <ProposalCard
            v-else-if="toolName(part) === 'proposeCaseFieldFills' && toolOutput(part)"
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
            v-else-if="toolName(part) === 'requestClarification' && toolOutput(part)?.questions"
            :questions="toolOutput(part).questions"
          />
          <DelicacyAlert
            v-else-if="toolName(part) === 'flagDelicateMatter' && toolOutput(part)?.summary"
            :summary="toolOutput(part).summary"
            :severity="toolOutput(part).severity"
            :reasons="toolOutput(part).reasons"
          />
          <ToolCallCard
            v-else
            :name="toolName(part)"
            :state="part.state"
            :input="part.input"
            :output="toolOutput(part)"
            :error-text="part.errorText"
          />
        </template>

        <CitationCard
          v-else-if="part.type === 'data-citation' && part.data"
          :rule="part.data"
          :snippet="part.data.snippet"
        />
      </template>
    </div>
  </div>
</template>
