import type { AppRouterClient } from "@nationa/api/routers/index";

export type UploadStatus = "idle" | "requesting" | "uploading" | "registering" | "done" | "error";

export type DocumentTypeItem = {
  id: string;
  code: string;
  nameFr: string;
  nameAr?: string | null;
  description?: string | null;
  acceptedMimeTypes?: string[] | null;
  requiredFields?: string[] | null;
};

export type UploadScope = {
  companyId?: string;
  caseId?: string;
  documentTypeId?: string;
};

export type UploadResult = {
  documentId: string;
  versionId: string;
  storageKey: string;
  fileName?: string;
};

export type DocumentRow = {
  id: string;
  title: string;
  status: string;
  companyId?: string | null;
  caseId?: string | null;
  documentTypeId?: string | null;
  createdAt?: string | Date | null;
};

export type DocumentVersionRow = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  version: number;
} | null;

export type ExtractionRow = {
  id: string;
  status: string;
  confidenceOverall?: string | null;
  model?: string | null;
  error?: string | null;
  completedAt?: string | Date | null;
} | null;

export type DocumentBundleItem = {
  document: DocumentRow;
  version: DocumentVersionRow;
  extraction: ExtractionRow;
};

export type ExtractedFieldItem = {
  id: string;
  key: string;
  labelRaw?: string | null;
  normalizedKey?: string | null;
  valueText?: string | null;
  valueJsonb?: unknown;
  confidence?: string | null;
};

export function useUpload() {
  const config = useRuntimeConfig();
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const client: AppRouterClient = useApi();

  const status = ref<UploadStatus>("idle");
  const progress = ref(0);
  const error = ref<string | null>(null);

  const isUploading = computed(
    () =>
      status.value === "requesting" ||
      status.value === "uploading" ||
      status.value === "registering",
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

  function resolveUploadUrl(uploadUrl: string): string {
    if (/^https?:\/\//.test(uploadUrl)) {
      return uploadUrl;
    }
    const base = ((config.public.serverUrl as string | undefined) ?? "").replace(/\/$/, "");
    return `${base}${uploadUrl}`;
  }

  function reset() {
    status.value = "idle";
    progress.value = 0;
    error.value = null;
  }

  async function upload(file: File, scope: UploadScope): Promise<UploadResult | null> {
    reset();

    if (!scope.companyId && !scope.caseId) {
      error.value = "missing-scope";
      status.value = "error";
      return null;
    }

    const mimeType = file.type || "application/octet-stream";

    try {
      status.value = "requesting";
      progress.value = 10;

      const requested = await client.documents.requestUpload({
        companyId: scope.companyId,
        caseId: scope.caseId,
        documentTypeId: scope.documentTypeId,
        fileName: file.name,
        mimeType,
        size: file.size,
      });

      progress.value = 35;

      const token = await resolveAccessToken();
      const headers: Record<string, string> = { "Content-Type": mimeType };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      status.value = "uploading";
      progress.value = 50;

      const response = await fetch(resolveUploadUrl(requested.uploadUrl), {
        method: "POST",
        body: file,
        headers,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      progress.value = 80;
      status.value = "registering";

      await client.documents.register({
        companyId: scope.companyId,
        caseId: scope.caseId,
        documentTypeId: scope.documentTypeId,
        documentId: requested.documentId,
        versionId: requested.versionId,
        storageKey: requested.storageKey,
        fileName: requested.fileName ?? file.name,
        mimeType,
        size: file.size,
        runExtraction: true,
      });

      progress.value = 100;
      status.value = "done";

      return {
        documentId: requested.documentId,
        versionId: requested.versionId,
        storageKey: requested.storageKey,
        fileName: requested.fileName ?? file.name,
      };
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : String(caught);
      status.value = "error";
      progress.value = 0;
      return null;
    }
  }

  return {
    upload,
    reset,
    status,
    progress,
    error,
    isUploading,
  };
}
