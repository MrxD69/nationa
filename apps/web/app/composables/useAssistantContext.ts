import type { Ref } from "vue";

export type DocgenContextPatch = {
  stepId?: string | null;
  docgenProposalId?: string | null;
};

export function useAssistantContext(): {
  stepId: Ref<string | null>;
  docgenProposalId: Ref<string | null>;
  pendingTurn: Ref<string | null>;
  setDocgenContext: (patch: DocgenContextPatch) => void;
  requestHandoff: (text: string) => void;
  consumePendingTurn: () => string | null;
} {
  const stepId = useState<string | null>("assistant-context:stepId", () => null);
  const docgenProposalId = useState<string | null>(
    "assistant-context:docgenProposalId",
    () => null,
  );
  const pendingTurn = useState<string | null>("assistant-context:pending-turn", () => null);

  function setDocgenContext(patch: DocgenContextPatch) {
    if (patch.stepId !== undefined) {
      stepId.value = patch.stepId;
    }
    if (patch.docgenProposalId !== undefined) {
      docgenProposalId.value = patch.docgenProposalId;
    }
  }

  function requestHandoff(text: string) {
    pendingTurn.value = text;
  }

  function consumePendingTurn(): string | null {
    const value = pendingTurn.value;
    pendingTurn.value = null;
    return value;
  }

  return {
    stepId,
    docgenProposalId,
    pendingTurn,
    setDocgenContext,
    requestHandoff,
    consumePendingTurn,
  };
}
