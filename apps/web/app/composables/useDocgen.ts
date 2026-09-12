import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";

import type {
  DocgenDraftPayload,
  DocgenDraftView,
  DocgenMode,
  DocumentContextView,
} from "@nationa/api/rpc/services/docgen.service";
import type { DocLang } from "@nationa/api/documents/templates/types";

export type { DocgenDraftPayload, DocgenDraftView, DocgenMode, DocumentContextView };

export type DocgenTemplateSummary = {
  code: string;
  version: number;
  documentTypeCode: string;
  title: { fr: string; ar: string };
  description: { fr: string; ar: string };
  defaultLanguage: DocLang;
  sectionCount: number;
  fieldKeys: string[];
};

export type DocgenScopeInput = {
  caseId?: string;
  companyId?: string;
};

export function useDocgen() {
  const { $orpc } = useNuxtApp();
  const queryClient = useQueryClient();
  const { locale } = useI18n();

  const defaultLanguage = computed<DocLang>(() => (locale.value === "ar" ? "ar" : "fr"));

  function templatesQuery() {
    return useQuery($orpc.docgen.listTemplates.queryOptions());
  }

  function templateQuery(code: string) {
    return useQuery($orpc.docgen.getTemplate.queryOptions({ input: { code } }));
  }

  function contextQuery(input: DocgenScopeInput & { templateCode: string }) {
    return useQuery($orpc.docgen.context.queryOptions({ input }));
  }

  function draftsQuery(
    input: DocgenScopeInput & {
      proposalId?: string;
      status?: "draft" | "accepted" | "rejected" | "superseded";
    },
  ) {
    return useQuery($orpc.docgen.listDrafts.queryOptions({ input }));
  }

  function invalidateDrafts(input: DocgenScopeInput) {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: $orpc.docgen.listDrafts.queryKey({ input }),
      }),
      queryClient.invalidateQueries({
        queryKey: $orpc.docgen.listDrafts.queryKey({ input: { caseId: input.caseId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: $orpc.docgen.listDrafts.queryKey({ input: { companyId: input.companyId } }),
      }),
    ]);
  }

  function generateMutation(options: { onSuccess?: (draft: DocgenDraftView) => void } = {}) {
    return useMutation({
      ...$orpc.docgen.generateDraft.mutationOptions(),
      onSuccess: (data) => {
        void queryClient.invalidateQueries({
          queryKey: $orpc.docgen.listDrafts.queryKey({ input: {} }),
        });
        options.onSuccess?.(data as unknown as DocgenDraftView);
      },
    });
  }

  function updateMutation() {
    return useMutation($orpc.docgen.updateDraft.mutationOptions());
  }

  function approveMutation() {
    return useMutation($orpc.docgen.approveDraft.mutationOptions());
  }

  function rejectMutation() {
    return useMutation($orpc.docgen.rejectDraft.mutationOptions());
  }

  return {
    defaultLanguage,
    templatesQuery,
    templateQuery,
    contextQuery,
    draftsQuery,
    invalidateDrafts,
    generateMutation,
    updateMutation,
    approveMutation,
    rejectMutation,
  };
}
