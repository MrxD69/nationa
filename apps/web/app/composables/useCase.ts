import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

export type UploadPreparation = {
  documentId: string;
  versionId: string;
  storageKey: string;
  uploadUrl: string;
};

export type RequestUploadInput = {
  companyId?: string;
  caseId: string;
  documentTypeId?: string;
  fileName: string;
  mimeType: string;
  size: number;
};

type RegisterInput = RequestUploadInput & {
  documentId: string;
  versionId: string;
  storageKey: string;
  runExtraction?: boolean;
};

type DocumentsLike = {
  requestUpload?: (input: RequestUploadInput) => Promise<Partial<UploadPreparation>>;
  register?: (input: RegisterInput) => Promise<unknown>;
  reprocess?: (input: {
    companyId?: string;
    documentId: string;
    documentVersionId?: string;
  }) => Promise<unknown>;
  listForCase?: (input: { caseId: string }) => Promise<unknown[]>;
};

type ChecksLike = {
  listFindings?: (input: {
    companyId?: string;
    subjectType: string;
    subjectId: string;
  }) => Promise<unknown[]>;
  run?: (input: { companyId?: string; subjectType: string; subjectId: string }) => Promise<unknown>;
};

function requireString(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing ${label} in document upload response`);
  }
  return value;
}

export function useCase() {
  const { $orpc, $orpcClient } = useNuxtApp();
  const queryClient = useQueryClient();
  const config = useRuntimeConfig();
  const requestURL = useRequestURL();
  const serverUrl = (
    (import.meta.server && config.serverUrl) ||
    config.public.serverUrl ||
    requestURL.origin
  ).replace(/\/$/, "");

  function invalidateCase(caseId: string) {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: $orpc.cases.get.queryKey({ input: { caseId } }) }),
      queryClient.invalidateQueries({
        queryKey: $orpc.cases.activity.queryKey({ input: { caseId } }),
      }),
    ]);
  }

  function casesQuery(options: { companyId?: string } = {}) {
    return useQuery($orpc.cases.list.queryOptions({ input: { companyId: options.companyId } }));
  }

  function caseQuery(caseId: string) {
    return useQuery($orpc.cases.get.queryOptions({ input: { caseId } }));
  }

  function activityQuery(caseId: string) {
    return useQuery($orpc.cases.activity.queryOptions({ input: { caseId } }));
  }

  function paymentQuery(caseId: string) {
    return useQuery($orpc.cases.previewPayment.queryOptions({ input: { caseId } }));
  }

  function proceduresQuery() {
    return useQuery($orpc.procedures.list.queryOptions());
  }

  function procedureQuery(input: { id?: string; code?: string }) {
    return useQuery($orpc.procedures.get.queryOptions({ input }));
  }

  function startMutation() {
    return useMutation({
      ...$orpc.cases.start.mutationOptions(),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: $orpc.cases.list.queryKey({ input: {} }) }),
    });
  }

  function saveFieldsMutation(caseId: string) {
    return useMutation({
      ...$orpc.cases.saveFields.mutationOptions(),
      onSuccess: () => invalidateCase(caseId),
    });
  }

  function completeStepMutation(caseId: string) {
    return useMutation({
      ...$orpc.cases.completeStep.mutationOptions(),
      onSuccess: () => invalidateCase(caseId),
    });
  }

  function skipStepMutation(caseId: string) {
    return useMutation({
      ...$orpc.cases.skipStep.mutationOptions(),
      onSuccess: () => invalidateCase(caseId),
    });
  }

  function submitMutation(caseId: string) {
    return useMutation({
      ...$orpc.cases.submit.mutationOptions(),
      onSuccess: () => invalidateCase(caseId),
    });
  }

  function cancelMutation(caseId: string) {
    return useMutation({
      ...$orpc.cases.cancel.mutationOptions(),
      onSuccess: () => invalidateCase(caseId),
    });
  }

  function applyFieldsMutation(caseId: string) {
    return useMutation({
      ...$orpc.cases.applyFields.mutationOptions(),
      onSuccess: () => invalidateCase(caseId),
    });
  }

  function documentsClient(): DocumentsLike {
    return $orpcClient as unknown as DocumentsLike;
  }

  function checksClient(): ChecksLike {
    return $orpcClient as unknown as ChecksLike;
  }

  async function uploadBytes(input: {
    uploadUrl: string;
    storageKey: string;
    file: File;
  }): Promise<void> {
    const url = input.uploadUrl.startsWith("http")
      ? input.uploadUrl
      : `${serverUrl}${input.uploadUrl}`;
    const session = useSupabaseSession();
    const token = session.value?.access_token ?? undefined;
    const contentType = input.file.type || "application/octet-stream";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        "content-type": contentType,
      },
      body: input.file,
    });

    if (!response.ok) {
      throw new Error(`File upload failed (${response.status})`);
    }
  }

  async function uploadCaseDocument(input: {
    caseId: string;
    companyId?: string;
    documentTypeId?: string;
    file: File;
  }): Promise<UploadPreparation> {
    const documents = documentsClient();
    if (typeof documents.requestUpload !== "function") {
      throw new Error("documents.requestUpload is not available");
    }

    const request: RequestUploadInput = {
      caseId: input.caseId,
      ...(input.companyId ? { companyId: input.companyId } : {}),
      ...(input.documentTypeId ? { documentTypeId: input.documentTypeId } : {}),
      fileName: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      size: input.file.size,
    };

    const requested = await documents.requestUpload(request);
    const documentId = requireString(requested.documentId, "documentId");
    const versionId = requireString(requested.versionId, "versionId");
    const storageKey = requireString(requested.storageKey, "storageKey");
    const uploadUrl = requested.uploadUrl ?? `/files/upload?key=${encodeURIComponent(storageKey)}`;

    await uploadBytes({ uploadUrl, storageKey, file: input.file });

    const registration: RegisterInput = {
      ...request,
      documentId,
      versionId,
      storageKey,
      runExtraction: true,
    };

    if (typeof documents.register === "function") {
      await documents.register(registration);
    } else if (input.companyId && typeof documents.reprocess === "function") {
      await documents.reprocess({
        companyId: input.companyId,
        documentId,
        documentVersionId: versionId,
      });
    }

    return { documentId, versionId, storageKey, uploadUrl };
  }

  async function listCaseDocuments(caseId: string): Promise<unknown[]> {
    const documents = documentsClient();
    if (typeof documents.listForCase === "function") {
      return documents.listForCase({ caseId });
    }
    return [];
  }

  async function listCaseFindings(input: { caseId: string; companyId?: string }) {
    if (!input.companyId) {
      return [];
    }
    const checks = checksClient();
    if (typeof checks.listFindings !== "function") {
      return [];
    }
    return checks.listFindings({
      companyId: input.companyId,
      subjectType: "case",
      subjectId: input.caseId,
    });
  }

  async function runCaseChecks(input: { caseId: string; companyId?: string }) {
    if (!input.companyId) {
      return null;
    }
    const checks = checksClient();
    if (typeof checks.run !== "function") {
      return null;
    }
    return checks.run({
      companyId: input.companyId,
      subjectType: "case",
      subjectId: input.caseId,
    });
  }

  return {
    casesQuery,
    caseQuery,
    activityQuery,
    paymentQuery,
    proceduresQuery,
    procedureQuery,
    startMutation,
    saveFieldsMutation,
    completeStepMutation,
    skipStepMutation,
    submitMutation,
    cancelMutation,
    applyFieldsMutation,
    uploadBytes,
    uploadCaseDocument,
    listCaseDocuments,
    listCaseFindings,
    runCaseChecks,
  };
}
