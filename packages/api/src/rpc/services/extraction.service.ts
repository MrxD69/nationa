import { generateObject, type FlexibleSchema, type LanguageModel, type UserContent } from "ai";

import type { Document, DocumentVersion, NewExtractedField } from "@nationa/db";

import {
  extractionSchemaByKind,
  extractionSchemaNameByKind,
  inferDocumentKind,
  mapExtractionToDrafts,
  type DocumentKind,
  type ExtractionOutput,
} from "../../domain/extraction";
import type { Context, Db } from "../context";
import {
  findCaseApplicantPersonId,
  findDocument,
  findDocumentVersion,
  findLatestDocumentVersion,
  insertActivityEvent,
  insertCompanyRegistrySnapshot,
  insertExtractedFields,
  insertExtraction,
  insertFieldProvenance,
  markExtractionFailed as markExtractionRowFailed,
  markExtractionSucceeded,
  updateDocumentStatus,
  upsertCaseFieldValue,
} from "../repositories/extraction.repo";

export type RunExtractionParams = {
  documentId: string;
  documentVersionId?: string;
  kind?: DocumentKind;
  model?: LanguageModel;
};

export type RunExtractionResult = {
  extractionId: string;
  documentId: string;
  documentVersionId: string;
  kind: DocumentKind;
  status: "succeeded" | "failed";
  confidenceOverall: number | null;
  fieldsWritten: number;
  error?: string;
};

export type StructuredExtractionInput = {
  model: LanguageModel;
  kind: DocumentKind;
  bytes: Uint8Array;
  mimeType: string;
  fileName?: string;
};

export type StructuredExtractionResult = {
  object: ExtractionOutput;
  modelId: string;
};

const SCHEMA_DESCRIPTIONS: Record<DocumentKind, string> = {
  rne_extract: "Fields extracted from a Tunisian RNE company registry extract.",
  cin: "Fields extracted from a Tunisian national identity card (CIN).",
  invoice: "Fields extracted from a supplier invoice, including line items.",
};

const SYSTEM_INSTRUCTIONS: Record<DocumentKind, string> = {
  rne_extract:
    "You extract structured data from Tunisian Registre National des Entreprises (RNE) extracts. " +
    "Documents may be in French or Arabic. Return only values that appear in the document; use null when a field is absent. " +
    "Dates must be ISO formatted (YYYY-MM-DD). Respond in the document's original language for labels.",
  cin:
    "You extract structured data from Tunisian national identity cards (CIN). " +
    "The document is usually in Arabic and French. Return only values that appear in the document; use null when absent. " +
    "Dates must be ISO formatted (YYYY-MM-DD).",
  invoice:
    "You extract structured data from supplier invoices. " +
    "Return only values that appear in the document; use null when a field is absent. " +
    "Dates must be ISO formatted (YYYY-MM-DD) and amounts must be plain numbers.",
};

const USER_INSTRUCTION =
  "Read the attached document and extract the requested fields. " +
  "Set the document-level `confidence` between 0 and 1 based on how legible and complete the document is.";

export async function extractStructuredDocument(
  input: StructuredExtractionInput,
): Promise<StructuredExtractionResult> {
  const content: UserContent = [
    { type: "text", text: USER_INSTRUCTION },
    {
      type: "file",
      data: input.bytes,
      mediaType: input.mimeType,
      filename: input.fileName ?? "document",
    },
  ];

  const schema = extractionSchemaByKind[input.kind] as FlexibleSchema<ExtractionOutput>;

  const result = await generateObject({
    model: input.model,
    schema,
    schemaName: extractionSchemaNameByKind[input.kind],
    schemaDescription: SCHEMA_DESCRIPTIONS[input.kind],
    instructions: SYSTEM_INSTRUCTIONS[input.kind],
    messages: [{ role: "user", content }],
  });

  return {
    object: result.object as ExtractionOutput,
    modelId: result.response.modelId,
  };
}

export async function runExtraction(
  ctx: Context,
  params: RunExtractionParams,
): Promise<RunExtractionResult> {
  const model = params.model ?? ctx.ai?.model;
  if (!model) {
    throw new Error("No language model is configured on the request context");
  }

  const document = await findDocument(ctx.db, params.documentId);
  if (!document) {
    throw new Error(`Document ${params.documentId} not found`);
  }

  const version = await resolveDocumentVersion(ctx.db, document, params.documentVersionId);
  if (!version) {
    throw new Error(`Document ${document.id} has no versions to extract`);
  }

  const kind =
    params.kind ?? inferDocumentKind({ title: document.title, mimeType: version.mimeType });

  await updateDocumentStatus(ctx.db, document.id, "processing");

  const modelId = getModelId(model);
  const extraction = await insertExtraction(ctx.db, {
    documentVersionId: version.id,
    kind: "llm_structured",
    engine: "google",
    model: modelId,
    status: "running",
    startedAt: new Date(),
  });

  if (!extraction) {
    throw new Error("Failed to create extraction record");
  }

  let stored: StoredDocumentBytes;
  try {
    stored = await readStoredDocument(ctx, version);
  } catch (error) {
    await recordExtractionFailure(ctx, {
      extractionId: extraction.id,
      document,
      versionId: version.id,
      kind,
      error,
    });
    throw error;
  }

  try {
    const extracted = await extractStructuredDocument({
      model,
      kind,
      bytes: stored.bytes,
      mimeType: stored.mimeType,
      fileName: version.fileName,
    });

    const confidenceOverall = readConfidence(extracted.object);
    await markExtractionSucceeded(ctx.db, extraction.id, {
      model: extracted.modelId || modelId,
      rawResult: extracted.object,
      confidenceOverall: toNumeric(confidenceOverall),
      completedAt: new Date(),
    });

    const fieldsWritten = await persistExtractionResult(ctx, {
      document,
      version,
      extractionId: extraction.id,
      kind,
      output: extracted.object,
      confidenceOverall,
    });

    const nextStatus =
      confidenceOverall !== null && confidenceOverall < 0.6 ? "needs_review" : "extracted";
    await updateDocumentStatus(ctx.db, document.id, nextStatus);

    await insertActivityEvent(ctx.db, {
      companyId: document.companyId,
      actorUserId: ctx.user?.id ?? null,
      actorType: "ai",
      entityType: "document",
      entityId: document.id,
      action: "document.extracted",
      summary: `Structured extraction (${kind}) succeeded`,
      data: {
        extractionId: extraction.id,
        documentVersionId: version.id,
        kind,
        confidenceOverall,
        fieldsWritten,
      },
    });

    return {
      extractionId: extraction.id,
      documentId: document.id,
      documentVersionId: version.id,
      kind,
      status: "succeeded",
      confidenceOverall,
      fieldsWritten,
    };
  } catch (error) {
    const message = await recordExtractionFailure(ctx, {
      extractionId: extraction.id,
      document,
      versionId: version.id,
      kind,
      error,
    });
    return {
      extractionId: extraction.id,
      documentId: document.id,
      documentVersionId: version.id,
      kind,
      status: "failed",
      confidenceOverall: null,
      fieldsWritten: 0,
      error: message,
    };
  }
}

type StoredDocumentBytes = {
  bytes: Uint8Array;
  mimeType: string;
};

async function resolveDocumentVersion(
  db: Db,
  document: Document,
  versionId?: string,
): Promise<DocumentVersion | null> {
  if (versionId) {
    return findDocumentVersion(db, versionId);
  }
  if (document.currentVersionId) {
    const version = await findDocumentVersion(db, document.currentVersionId);
    if (version) {
      return version;
    }
  }
  return findLatestDocumentVersion(db, document.id);
}

async function readStoredDocument(
  ctx: Context,
  version: DocumentVersion,
): Promise<StoredDocumentBytes> {
  const object = await ctx.storage.get(version.storagePath);
  if (!object) {
    throw new Error(`Stored object not found for document version ${version.id}`);
  }
  return {
    bytes: await readStream(object.body),
    mimeType: object.contentType ?? version.mimeType,
  };
}

async function readStream(stream: ReadableStream): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
        chunks.push(chunk);
        total += chunk.length;
      }
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

type ResolvedSubject = {
  subjectType: "company" | "person" | "case_field";
  subjectId: string;
};

async function resolveProvenanceSubject(
  ctx: Context,
  document: Document,
  kind: DocumentKind,
): Promise<ResolvedSubject | null> {
  if (kind === "cin" && document.caseId) {
    const applicantPersonId = await findCaseApplicantPersonId(ctx.db, document.caseId);
    if (applicantPersonId) {
      return { subjectType: "person", subjectId: applicantPersonId };
    }
  }
  if (document.companyId) {
    return { subjectType: "company", subjectId: document.companyId };
  }
  if (document.caseId) {
    return { subjectType: "case_field", subjectId: document.caseId };
  }
  return null;
}

async function persistExtractionResult(
  ctx: Context,
  input: {
    document: Document;
    version: DocumentVersion;
    extractionId: string;
    kind: DocumentKind;
    output: ExtractionOutput;
    confidenceOverall: number | null;
  },
): Promise<number> {
  const { document, version, extractionId, kind, output } = input;
  const drafts = mapExtractionToDrafts(output);

  const fieldRows = drafts.map((draft) => ({
    id: crypto.randomUUID(),
    extractionId,
    key: draft.key,
    labelRaw: draft.labelRaw,
    normalizedKey: draft.normalizedKey,
    valueText: draft.valueText,
    valueJsonb: draft.valueJsonb ?? null,
    confidence: toNumeric(draft.confidence),
  }));

  await insertExtractedFields(ctx.db, fieldRows);

  const subject = await resolveProvenanceSubject(ctx, document, kind);
  if (subject && fieldRows.length > 0) {
    const provenanceRows = fieldRows.map((row, index) => ({
      subjectType: subject.subjectType,
      subjectId: subject.subjectId,
      fieldKey: drafts[index]?.normalizedKey ?? drafts[index]?.key ?? row.key,
      sourceKind: "document" as const,
      sourceDocumentVersionId: version.id,
      extractionFieldId: row.id,
      confidence: row.confidence,
    }));
    await insertFieldProvenance(ctx.db, provenanceRows);
  }

  if (document.caseId) {
    await upsertCaseFieldValues(ctx.db, {
      caseId: document.caseId,
      versionId: version.id,
      drafts,
      fieldRows,
    });
  }

  if (kind === "rne_extract" && document.companyId && output.kind === "rne_extract") {
    await insertCompanyRegistrySnapshot(ctx.db, {
      companyId: document.companyId,
      documentVersionId: version.id,
      extractNumber: output.extractNumber ?? null,
      editionDate: normalizeDateToIso(output.editionDate),
      verificationNumber: output.verificationNumber ?? null,
      registryState: normalizeRegistryState(output.registryState),
      snapshot: output as unknown as Record<string, unknown>,
    });
  }

  return fieldRows.length;
}

async function upsertCaseFieldValues(
  db: Db,
  input: {
    caseId: string;
    versionId: string;
    drafts: ReturnType<typeof mapExtractionToDrafts>;
    fieldRows: NewExtractedField[];
  },
): Promise<void> {
  const { caseId, versionId, drafts, fieldRows } = input;
  for (const [index, draft] of drafts.entries()) {
    const row = fieldRows[index];
    if (!row) {
      continue;
    }
    const fieldKey = draft.normalizedKey ?? draft.key;
    const values = {
      valueText: draft.valueText,
      valueJsonb: draft.valueJsonb ?? null,
      sourceKind: "document" as const,
      sourceDocumentVersionId: versionId,
      extractionFieldId: row.id,
      confidence: row.confidence,
      updatedAt: new Date(),
    };
    await upsertCaseFieldValue(db, { caseId, fieldKey, ...values });
  }
}

async function recordExtractionFailure(
  ctx: Context,
  input: {
    extractionId: string;
    document: Document;
    versionId: string;
    kind: DocumentKind;
    error: unknown;
  },
): Promise<string> {
  const message = describeError(input.error);
  await markExtractionRowFailed(ctx.db, input.extractionId, {
    error: message,
    completedAt: new Date(),
  });
  await updateDocumentStatus(ctx.db, input.document.id, "failed");
  await insertActivityEvent(ctx.db, {
    companyId: input.document.companyId,
    actorUserId: ctx.user?.id ?? null,
    actorType: "ai",
    entityType: "document",
    entityId: input.document.id,
    action: "document.extraction_failed",
    summary: `Structured extraction (${input.kind}) failed`,
    data: {
      extractionId: input.extractionId,
      documentVersionId: input.versionId,
      kind: input.kind,
      error: message,
    },
  });
  return message;
}

function getModelId(model: LanguageModel): string {
  if (typeof model === "string") {
    return model;
  }
  const modelId = (model as { modelId?: unknown }).modelId;
  return typeof modelId === "string" ? modelId : "unknown";
}

function readConfidence(output: ExtractionOutput): number | null {
  return typeof output.confidence === "number" ? output.confidence : null;
}

function toNumeric(value: number | null): string | null {
  return value === null || Number.isNaN(value) ? null : value.toFixed(2);
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function normalizeDateToIso(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const dayFirst = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  if (dayFirst) {
    const day = dayFirst[1]?.padStart(2, "0");
    const month = dayFirst[2]?.padStart(2, "0");
    const year = dayFirst[3];
    if (day && month && year) {
      return `${year}-${month}-${day}`;
    }
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

export function normalizeRegistryState(
  value: string | null | undefined,
): "actif" | "suspendu" | "radie" | null {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase();
  if (normalized.includes("suspend")) {
    return "suspendu";
  }
  if (normalized.includes("radi")) {
    return "radie";
  }
  if (normalized.includes("actif") || normalized.includes("active")) {
    return "actif";
  }
  return null;
}
