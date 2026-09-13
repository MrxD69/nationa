import { ORPCError } from "@orpc/server";

import type {
  Case,
  Document,
  DocumentVersion,
  ExtractedField,
  Extraction,
  FieldProvenance,
} from "@nationa/db";

import { assertCompanyPermission, requireUser } from "../../auth/access";
import { assertCasePermission } from "../../auth/case-access";
import { inferDocumentKind, type DocumentKind } from "../../domain/extraction";
import type { CompanyPermission } from "../../permissions";
import { documentObjectKey, sanitizeFileName } from "../../storage/port";
import type { Context, Db } from "../context";
import * as companiesRepo from "../repositories/companies.repo";
import * as repo from "../repositories/documents.repo";
import { runExtraction } from "./extraction.service";

export type DocumentScope = {
  companyId?: string;
  caseId?: string;
};

export type UploadRequestInput = DocumentScope & {
  documentTypeId?: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type UploadRequestResult = {
  documentId: string;
  versionId: string;
  storageKey: string;
  uploadUrl: string;
  fileName: string;
};

export type DocumentUrlResult = {
  url: string;
  mimeType: string;
  fileName: string;
};

export type RegisterDocumentInput = DocumentScope & {
  documentTypeId?: string;
  documentTypeCode?: string;
  documentId?: string;
  versionId?: string;
  storageKey?: string;
  title?: string;
  description?: string;
  fileName: string;
  mimeType: string;
  size: number;
  hash?: string;
  pageCount?: number;
  kind?: DocumentKind;
  runExtraction?: boolean;
  extract?: boolean;
};

export type DocumentBundle = {
  document: Document;
  version: DocumentVersion | null;
  extraction: Extraction | null;
};

export type DocumentDetail = DocumentBundle & {
  fields: ExtractedField[];
  provenance: FieldProvenance[];
};

export function buildUploadUrl(storageKey: string): string {
  return `/files/upload?key=${encodeURIComponent(storageKey)}`;
}

export async function requireDocumentById(db: Db, documentId: string): Promise<Document> {
  const document = await repo.findDocumentById(db, documentId);
  if (!document) {
    throw new ORPCError("NOT_FOUND", { message: "Document not found" });
  }
  return document;
}

export async function assertCaseAccess(
  context: Context,
  caseId: string,
  permission: CompanyPermission = "documents.read",
): Promise<Case> {
  requireUser(context);
  const caseRecord = await repo.findCaseById(context.db, caseId);
  if (!caseRecord) {
    throw new ORPCError("NOT_FOUND", { message: "Case not found" });
  }
  await assertCasePermission(context, caseRecord, permission);
  return caseRecord;
}

export async function assertDocumentAccess(
  context: Context,
  document: Document,
  companyId?: string,
  permission: CompanyPermission = "documents.read",
): Promise<void> {
  if (companyId) {
    await assertCompanyPermission(context, companyId, permission);
    if (document.companyId && document.companyId !== companyId) {
      throw new ORPCError("NOT_FOUND", { message: "Document not found" });
    }
    return;
  }
  if (document.companyId) {
    await assertCompanyPermission(context, document.companyId, permission);
    return;
  }
  if (document.caseId) {
    await assertCaseAccess(context, document.caseId, permission);
    return;
  }
  requireUser(context);
}

export async function loadCurrentVersion(
  db: Db,
  document: Document,
): Promise<DocumentVersion | null> {
  if (document.currentVersionId) {
    const version = await repo.findDocumentVersionById(db, document.currentVersionId);
    if (version) {
      return version;
    }
  }
  return repo.findLatestDocumentVersion(db, document.id);
}

export async function loadLatestExtraction(
  db: Db,
  documentVersionId: string,
): Promise<Extraction | null> {
  return repo.findLatestExtraction(db, documentVersionId);
}

export async function resolveDocumentKind(
  db: Db,
  input: {
    documentTypeId?: string;
    documentTypeCode?: string;
    title?: string;
    mimeType?: string;
    kind?: DocumentKind;
  },
): Promise<DocumentKind> {
  if (input.kind) {
    return input.kind;
  }
  let code = input.documentTypeCode ?? null;
  if (!code && input.documentTypeId) {
    code = await repo.findDocumentTypeCode(db, input.documentTypeId);
  }
  return inferDocumentKind({
    code,
    title: input.title ?? null,
    mimeType: input.mimeType ?? null,
  });
}

async function enrichDocuments(db: Db, rows: Document[]): Promise<DocumentBundle[]> {
  const bundles: DocumentBundle[] = [];
  for (const document of rows) {
    const version = await loadCurrentVersion(db, document);
    const extraction = version ? await loadLatestExtraction(db, version.id) : null;
    bundles.push({ document, version, extraction });
  }
  return bundles;
}

export async function getDocumentDetail(
  context: Context,
  input: { companyId?: string; documentId: string },
): Promise<DocumentDetail> {
  requireUser(context);
  const document = await requireDocumentById(context.db, input.documentId);
  await assertDocumentAccess(context, document, input.companyId);

  const version = await loadCurrentVersion(context.db, document);
  const extraction = version ? await loadLatestExtraction(context.db, version.id) : null;
  const fields = extraction ? await repo.listExtractedFields(context.db, extraction.id) : [];
  const fieldIds = fields.map((field) => field.id);
  const provenance =
    fieldIds.length > 0 ? await repo.listProvenanceByFieldIds(context.db, fieldIds) : [];

  return { document, version, extraction, fields, provenance };
}

export async function getDocumentUrl(
  context: Context,
  input: { companyId: string; documentId: string },
): Promise<DocumentUrlResult> {
  requireUser(context);
  const document = await requireDocumentById(context.db, input.documentId);
  await assertDocumentAccess(context, document, input.companyId);

  const version = await loadCurrentVersion(context.db, document);
  if (!version) {
    throw new ORPCError("NOT_FOUND", { message: "Document has no current version" });
  }

  return {
    url: await context.storage.presignGet(version.storagePath, {
      downloadName: version.fileName,
    }),
    mimeType: version.mimeType,
    fileName: version.fileName,
  };
}

export async function listCompanyDocuments(
  context: Context,
  input: { companyId: string; documentTypeId?: string; limit?: number },
): Promise<DocumentBundle[]> {
  await assertCompanyPermission(context, input.companyId, "documents.read");
  const rows = await repo.listCompanyDocuments(context.db, input);
  return enrichDocuments(context.db, rows);
}

export async function listCaseDocuments(
  context: Context,
  input: { caseId: string },
): Promise<DocumentBundle[]> {
  await assertCaseAccess(context, input.caseId, "documents.read");
  const rows = await repo.listCaseDocuments(context.db, input.caseId);
  return enrichDocuments(context.db, rows);
}

export async function listActiveDocumentTypes(context: Context) {
  requireUser(context);
  return repo.listActiveDocumentTypes(context.db);
}

function fileExtension(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot).toLowerCase() : "";
  return /^\.[a-z0-9]+$/.test(ext) ? ext : ".bin";
}

async function resolveExpressiveFileName(
  context: Context,
  input: UploadRequestInput,
): Promise<string> {
  if (!input.companyId || !input.documentTypeId) {
    return input.fileName;
  }
  try {
    const company = await companiesRepo.findCompanyById(context.db, input.companyId);
    const typeCode = await repo.findDocumentTypeCode(context.db, input.documentTypeId);
    if (!company || !typeCode) {
      return input.fileName;
    }
    const companyLabel =
      company.uniqueIdentifier || company.tradeName || company.legalName || "company";
    const date = new Date().toISOString().slice(0, 10);
    const raw = `${companyLabel}_${typeCode}_${date}${fileExtension(input.fileName)}`;
    return sanitizeFileName(raw);
  } catch {
    return input.fileName;
  }
}

export async function requestUpload(
  context: Context,
  input: UploadRequestInput,
): Promise<UploadRequestResult> {
  const user = requireUser(context);
  if (!input.companyId && !input.caseId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "A companyId or caseId is required to upload a document",
    });
  }
  if (input.companyId) {
    await assertCompanyPermission(context, input.companyId, "documents.write");
  } else if (input.caseId) {
    await assertCaseAccess(context, input.caseId, "documents.write");
  }

  const expressiveName = await resolveExpressiveFileName(context, input);

  const created = await repo.insertDocument(context.db, {
    companyId: input.companyId ?? null,
    caseId: input.caseId ?? null,
    documentTypeId: input.documentTypeId ?? null,
    ownerUserId: user.id,
    title: expressiveName,
    status: "uploaded",
  });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create document" });
  }

  const storageKey = documentObjectKey({
    companyId: input.companyId,
    caseId: input.caseId,
    documentId: created.id,
    version: 1,
    fileName: expressiveName,
  });

  const version = await repo.insertDocumentVersion(context.db, {
    documentId: created.id,
    version: 1,
    storageBucket: context.storage.bucket,
    storagePath: storageKey,
    fileName: expressiveName,
    mimeType: input.mimeType,
    size: input.size,
    source: "upload",
    uploadedByUserId: user.id,
  });

  if (!version) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create document version" });
  }

  await repo.updateDocument(context.db, created.id, { currentVersionId: version.id });

  return {
    documentId: created.id,
    versionId: version.id,
    storageKey,
    uploadUrl: buildUploadUrl(storageKey),
    fileName: expressiveName,
  };
}

export async function registerDocument(
  context: Context,
  input: RegisterDocumentInput,
): Promise<{ document: Document; version: DocumentVersion }> {
  const user = requireUser(context);

  let document: Document | undefined;
  let companyId = input.companyId;
  let caseId = input.caseId;

  if (input.documentId) {
    document = await requireDocumentById(context.db, input.documentId);
    companyId = companyId ?? document.companyId ?? undefined;
    caseId = caseId ?? document.caseId ?? undefined;
    await assertDocumentAccess(context, document, companyId, "documents.write");
  } else if (companyId) {
    await assertCompanyPermission(context, companyId, "documents.write");
  } else if (caseId) {
    await assertCaseAccess(context, caseId, "documents.write");
  } else {
    throw new ORPCError("BAD_REQUEST", {
      message: "A companyId or caseId is required to register a document",
    });
  }

  const title = input.title ?? input.fileName;

  if (document) {
    const updated = await repo.updateDocument(context.db, document.id, {
      companyId: companyId ?? null,
      caseId: caseId ?? null,
      documentTypeId: input.documentTypeId ?? document.documentTypeId,
      title: input.title ?? document.title ?? title,
      description: input.description ?? document.description,
      status: "uploaded",
    });
    document = updated ?? document;
  } else {
    const created = await repo.insertDocument(context.db, {
      companyId: companyId ?? null,
      caseId: caseId ?? null,
      documentTypeId: input.documentTypeId ?? null,
      ownerUserId: user.id,
      title,
      description: input.description ?? null,
      status: "uploaded",
    });
    if (!created) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create document" });
    }
    document = created;
  }

  const storageKey =
    input.storageKey ??
    documentObjectKey({
      companyId,
      caseId,
      documentId: document.id,
      version: 1,
      fileName: input.fileName,
    });

  let version: DocumentVersion | undefined;
  const existingVersionId = input.versionId ?? document.currentVersionId ?? undefined;
  if (existingVersionId) {
    const existing = await repo.findDocumentVersionForDocument(
      context.db,
      existingVersionId,
      document.id,
    );
    if (existing) {
      const updatedVersion = await repo.updateDocumentVersion(context.db, existing.id, {
        storageBucket: context.storage.bucket,
        storagePath: storageKey,
        fileName: input.fileName,
        mimeType: input.mimeType,
        size: input.size,
        hash: input.hash ?? existing.hash,
        pageCount: input.pageCount ?? existing.pageCount,
      });
      version = updatedVersion ?? existing;
    }
  }

  if (!version) {
    const latestVersion = await repo.findLatestVersionNumber(context.db, document.id);
    const nextVersion = (latestVersion ?? 0) + 1;
    const createdVersion = await repo.insertDocumentVersion(context.db, {
      documentId: document.id,
      version: nextVersion,
      storageBucket: context.storage.bucket,
      storagePath: storageKey,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
      hash: input.hash ?? null,
      pageCount: input.pageCount ?? null,
      source: "upload",
      uploadedByUserId: user.id,
    });
    if (!createdVersion) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create document version",
      });
    }
    version = createdVersion;
  }

  if (document.currentVersionId !== version.id) {
    const updatedDocument = await repo.updateDocument(context.db, document.id, {
      currentVersionId: version.id,
    });
    document = updatedDocument ?? document;
  }

  const shouldExtract = input.runExtraction !== false && (input.extract ?? true);
  if (shouldExtract) {
    const kind = await resolveDocumentKind(context.db, {
      documentTypeId: document.documentTypeId ?? input.documentTypeId,
      documentTypeCode: input.documentTypeCode,
      title: document.title,
      mimeType: input.mimeType,
      kind: input.kind,
    });
    try {
      await runExtraction(context, {
        documentId: document.id,
        documentVersionId: version.id,
        kind,
      });
    } catch {
      // Extraction failures are surfaced through the document/extraction status.
    }
  }

  return { document, version };
}

export async function reprocessDocument(
  context: Context,
  input: {
    companyId?: string;
    documentId: string;
    documentVersionId?: string;
    kind?: DocumentKind;
  },
) {
  requireUser(context);
  const document = await requireDocumentById(context.db, input.documentId);
  await assertDocumentAccess(context, document, input.companyId, "documents.extract");
  const kind = input.kind ?? (await resolveDocumentKind(context.db, { title: document.title }));
  return runExtraction(context, {
    documentId: document.id,
    documentVersionId: input.documentVersionId,
    kind,
  });
}

export async function attachDocumentToCase(
  context: Context,
  input: { caseId: string; documentId: string; stepId?: string },
): Promise<{ document: Document; stepId: string | null }> {
  requireUser(context);
  await assertCaseAccess(context, input.caseId, "documents.write");
  const document = await requireDocumentById(context.db, input.documentId);
  if (document.companyId) {
    await assertCompanyPermission(context, document.companyId, "documents.write");
  }

  if (input.stepId) {
    const step = await repo.findCaseStep(context.db, input.stepId, input.caseId);
    if (!step) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Case step does not belong to the given case",
      });
    }
  }

  const updated = await repo.updateDocument(context.db, document.id, { caseId: input.caseId });

  return { document: updated ?? document, stepId: input.stepId ?? null };
}
