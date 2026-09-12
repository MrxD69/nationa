import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import {
  caseSteps,
  cases,
  documentTypes,
  documentVersions,
  documents,
  extractedFields,
  extractions,
  fieldProvenance,
  type Case,
  type Document,
  type DocumentVersion,
  type Extraction,
  type ExtractedField,
  type FieldProvenance,
  type NewDocument,
  type NewDocumentVersion,
} from "@nationa/db";

import type { Db } from "../context";

export async function findDocumentById(db: Db, documentId: string): Promise<Document | null> {
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1);
  return document ?? null;
}

export async function findCaseById(db: Db, caseId: string): Promise<Case | null> {
  const [caseRecord] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  return caseRecord ?? null;
}

export async function findDocumentVersionById(
  db: Db,
  versionId: string,
): Promise<DocumentVersion | null> {
  const [version] = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.id, versionId))
    .limit(1);
  return version ?? null;
}

export async function findDocumentVersionForDocument(
  db: Db,
  versionId: string,
  documentId: string,
): Promise<DocumentVersion | null> {
  const [version] = await db
    .select()
    .from(documentVersions)
    .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId)))
    .limit(1);
  return version ?? null;
}

export async function findLatestDocumentVersion(
  db: Db,
  documentId: string,
): Promise<DocumentVersion | null> {
  const [latest] = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.version))
    .limit(1);
  return latest ?? null;
}

export async function findLatestVersionNumber(db: Db, documentId: string): Promise<number | null> {
  const [latest] = await db
    .select({ version: documentVersions.version })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.version))
    .limit(1);
  return latest?.version ?? null;
}

export async function findLatestExtraction(
  db: Db,
  documentVersionId: string,
): Promise<Extraction | null> {
  const [extraction] = await db
    .select()
    .from(extractions)
    .where(eq(extractions.documentVersionId, documentVersionId))
    .orderBy(desc(extractions.createdAt))
    .limit(1);
  return extraction ?? null;
}

export async function findDocumentTypeCode(db: Db, documentTypeId: string): Promise<string | null> {
  const [documentType] = await db
    .select({ code: documentTypes.code })
    .from(documentTypes)
    .where(eq(documentTypes.id, documentTypeId))
    .limit(1);
  return documentType?.code ?? null;
}

export async function listCompanyDocuments(
  db: Db,
  input: { companyId: string; documentTypeId?: string; limit?: number },
): Promise<Document[]> {
  const conditions = [eq(documents.companyId, input.companyId), isNull(documents.deletedAt)];
  if (input.documentTypeId) {
    conditions.push(eq(documents.documentTypeId, input.documentTypeId));
  }
  return db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt))
    .limit(input.limit ?? 50);
}

export async function listCaseDocuments(db: Db, caseId: string): Promise<Document[]> {
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.caseId, caseId), isNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt));
}

export async function listActiveDocumentTypes(db: Db) {
  return db
    .select()
    .from(documentTypes)
    .where(eq(documentTypes.active, true))
    .orderBy(documentTypes.code);
}

export async function listExtractedFields(db: Db, extractionId: string): Promise<ExtractedField[]> {
  return db
    .select()
    .from(extractedFields)
    .where(eq(extractedFields.extractionId, extractionId))
    .orderBy(extractedFields.key);
}

export async function listProvenanceByFieldIds(
  db: Db,
  fieldIds: string[],
): Promise<FieldProvenance[]> {
  return db
    .select()
    .from(fieldProvenance)
    .where(inArray(fieldProvenance.extractionFieldId, fieldIds));
}

export async function findCaseStep(
  db: Db,
  stepId: string,
  caseId: string,
): Promise<{ id: string } | null> {
  const [step] = await db
    .select({ id: caseSteps.id })
    .from(caseSteps)
    .where(and(eq(caseSteps.id, stepId), eq(caseSteps.caseId, caseId)))
    .limit(1);
  return step ?? null;
}

export async function insertDocument(db: Db, values: NewDocument): Promise<Document | null> {
  const [document] = await db.insert(documents).values(values).returning();
  return document ?? null;
}

export async function updateDocument(
  db: Db,
  documentId: string,
  values: Partial<NewDocument>,
): Promise<Document | null> {
  const [document] = await db
    .update(documents)
    .set(values)
    .where(eq(documents.id, documentId))
    .returning();
  return document ?? null;
}

export async function insertDocumentVersion(
  db: Db,
  values: NewDocumentVersion,
): Promise<DocumentVersion | null> {
  const [version] = await db.insert(documentVersions).values(values).returning();
  return version ?? null;
}

export async function updateDocumentVersion(
  db: Db,
  versionId: string,
  values: Partial<NewDocumentVersion>,
): Promise<DocumentVersion | null> {
  const [version] = await db
    .update(documentVersions)
    .set(values)
    .where(eq(documentVersions.id, versionId))
    .returning();
  return version ?? null;
}
