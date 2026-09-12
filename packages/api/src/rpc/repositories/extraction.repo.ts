import { and, desc, eq, isNull } from "drizzle-orm";

import {
  activityEvents,
  caseFieldValues,
  cases,
  companyRegistrySnapshots,
  documentVersions,
  documents,
  extractedFields,
  extractions,
  fieldProvenance,
  type Document,
  type DocumentVersion,
  type Extraction,
  type NewActivityEvent,
  type NewCaseFieldValue,
  type NewCompanyRegistrySnapshot,
  type NewExtractedField,
  type NewExtraction,
  type NewFieldProvenance,
} from "@nationa/db";

import type { Db } from "../context";

export async function findDocument(db: Db, documentId: string): Promise<Document | null> {
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1);
  return document ?? null;
}

export async function findDocumentVersion(
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

export async function updateDocumentStatus(
  db: Db,
  documentId: string,
  status: Document["status"],
): Promise<void> {
  await db.update(documents).set({ status }).where(eq(documents.id, documentId));
}

export async function insertExtraction(db: Db, values: NewExtraction): Promise<Extraction | null> {
  const [extraction] = await db.insert(extractions).values(values).returning();
  return extraction ?? null;
}

export async function markExtractionSucceeded(
  db: Db,
  extractionId: string,
  values: {
    model: string;
    rawResult: unknown;
    confidenceOverall: string | null;
    completedAt: Date;
  },
): Promise<void> {
  await db
    .update(extractions)
    .set({ status: "succeeded", ...values })
    .where(eq(extractions.id, extractionId));
}

export async function markExtractionFailed(
  db: Db,
  extractionId: string,
  values: { error: string; completedAt: Date },
): Promise<void> {
  await db
    .update(extractions)
    .set({ status: "failed", ...values })
    .where(eq(extractions.id, extractionId));
}

export async function findCaseApplicantPersonId(db: Db, caseId: string): Promise<string | null> {
  const [caseRecord] = await db
    .select({ applicantPersonId: cases.applicantPersonId })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);
  return caseRecord?.applicantPersonId ?? null;
}

export async function insertExtractedFields(db: Db, rows: NewExtractedField[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.insert(extractedFields).values(rows);
}

export async function insertFieldProvenance(db: Db, rows: NewFieldProvenance[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.insert(fieldProvenance).values(rows);
}

export async function upsertCaseFieldValue(db: Db, values: NewCaseFieldValue): Promise<void> {
  const { caseId, fieldKey, ...rest } = values;
  await db
    .insert(caseFieldValues)
    .values({ caseId, fieldKey, ...rest })
    .onConflictDoUpdate({
      target: [caseFieldValues.caseId, caseFieldValues.fieldKey],
      set: rest,
    });
}

export async function insertCompanyRegistrySnapshot(
  db: Db,
  values: NewCompanyRegistrySnapshot,
): Promise<void> {
  await db.insert(companyRegistrySnapshots).values(values);
}

export async function insertActivityEvent(db: Db, values: NewActivityEvent): Promise<void> {
  await db.insert(activityEvents).values(values);
}
