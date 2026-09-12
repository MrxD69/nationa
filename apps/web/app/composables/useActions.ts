import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { Ref } from "vue";

export type ActionStepState =
  | "not_started"
  | "in_progress"
  | "done"
  | "verified"
  | "generated"
  | "needs_correction"
  | "blocked";

export type ActionCatalogItem = {
  id: string;
  agencyId: string;
  agencyNameFr: string | null;
  agencyNameAr: string | null;
  code: string;
  nameFr: string;
  nameAr: string | null;
  description: string | null;
  category: string | null;
  estimatedDays: number | null;
  stepCount: number;
  requiredDocumentCount: number;
  status: ActionStepState;
  progress: number;
  caseId: string | null;
};

export type ActionStepSignals = Record<string, boolean>;

export type ActionDocument = {
  document: {
    id: string;
    title: string;
    status: string;
    documentTypeId: string | null;
    currentVersionId: string | null;
  };
  version: {
    id: string;
    source: string;
    fileName: string;
    mimeType: string;
    uploadedAt: string | Date;
  } | null;
};

export type ActionFinding = {
  id: string;
  severity: string;
  code: string;
  title: string;
  messagePlain: string;
  suggestedFix: string | null;
  status: string;
};

export type ActionStep = {
  id: string;
  caseStepId: string | null;
  templateStepId: string | null;
  position: number;
  code: string;
  titleFr: string;
  titleAr: string | null;
  description: string | null;
  stepType: string;
  isOptional: boolean;
  state: ActionStepState;
  reachable: boolean;
  signals: ActionStepSignals;
  requiredDocumentType: {
    id: string;
    code: string;
    nameFr: string;
    nameAr: string | null;
  } | null;
  formSchema: {
    version: number;
    fields: Array<{ key: string; type: string; required: boolean }>;
  };
  citations: Array<{
    id: string;
    source: string;
    article: string | null;
    titleFr: string | null;
    titleAr: string | null;
    textFr: string | null;
    textAr: string | null;
    url: string | null;
  }>;
  fields: Array<{
    id: string;
    fieldKey: string;
    valueText: string | null;
    valueJsonb: unknown;
    sourceKind: string;
  }>;
  documents: ActionDocument[];
  findings: ActionFinding[];
};

export type ActionTracker = {
  action: {
    id: string;
    agencyId: string;
    agencyNameFr: string | null;
    agencyNameAr: string | null;
    code: string;
    nameFr: string;
    nameAr: string | null;
    description: string | null;
    category: string | null;
    estimatedDays: number | null;
    stepCount: number;
  };
  case: {
    id: string;
    title: string;
    status: string;
    companyId: string | null;
  } | null;
  feeSummary: {
    currency: string;
    total: number;
    items: Array<{ feeId: string; label: string; amount: number; currency: string }>;
  } | null;
  aggregate: {
    state: ActionStepState;
    progress: number;
    totalSteps: number;
    completedSteps: number;
    nextStepId: string | null;
  };
  verification: {
    hasRun: boolean;
    runId: string | null;
    runStatus: string | null;
    ranAt: string | Date | null;
    findingsCount: number;
    openErrors: number;
    openBlockers: number;
  };
  steps: ActionStep[];
};

export type StartActionResult = {
  resumed: boolean;
  caseId: string;
  tracker: ActionTracker;
};

export function useActions() {
  const { $orpc } = useNuxtApp();
  const queryClient = useQueryClient();

  function catalogQuery(options: { companyId?: string; agencyId?: string } = {}) {
    return useQuery(
      $orpc.actions.list.queryOptions({
        input: { companyId: options.companyId, agencyId: options.agencyId },
      }),
    );
  }

  function outstandingQuery(options: { companyId?: string; limit?: number } = {}) {
    return useQuery(
      $orpc.actions.outstanding.queryOptions({
        input: { companyId: options.companyId, limit: options.limit },
      }),
    );
  }

  function searchQuery(input: {
    query: Ref<string>;
    companyId?: Ref<string | undefined>;
    limit?: number;
    enabled?: Ref<boolean>;
  }) {
    return useQuery(() => {
      const query = input.query.value.trim();
      return {
        ...$orpc.actions.search.queryOptions({
          input: {
            query: query.length > 0 ? query : " ",
            companyId: input.companyId?.value,
            limit: input.limit,
          },
        }),
        enabled: (input.enabled?.value ?? true) && query.length > 0,
      };
    });
  }

  function trackerQuery(input: {
    templateId?: string;
    code?: string;
    caseId?: string;
    companyId?: string;
  }) {
    return useQuery($orpc.actions.get.queryOptions({ input }));
  }

  function startMutation() {
    return useMutation({
      ...$orpc.actions.start.mutationOptions(),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: $orpc.actions.list.queryKey({ input: {} }) });
        queryClient.invalidateQueries({
          queryKey: $orpc.actions.outstanding.queryKey({ input: {} }),
        });
      },
    });
  }

  function runChecksMutation(caseId: string) {
    return useMutation({
      ...$orpc.actions.runChecks.mutationOptions(),
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: $orpc.actions.get.queryKey({ input: { caseId } }),
        }),
    });
  }

  return {
    catalogQuery,
    outstandingQuery,
    searchQuery,
    trackerQuery,
    startMutation,
    runChecksMutation,
  };
}
