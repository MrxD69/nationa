import { and, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";

import {
  agencies,
  caseFieldValues,
  caseSteps,
  cases,
  companies,
  companyAccessGrants,
  documentTypes,
  documents,
  fees,
  fieldProvenance,
  procedureStepCitations,
  procedureSteps,
  procedureTemplates,
  ruleCitations,
  type Case,
  type CaseFieldValue,
  type CaseStep,
  type Company,
  type Document,
  type DocumentType,
  type Fee,
  type FieldProvenance,
  type NewCase,
  type NewCaseFieldValue,
  type NewCaseStep,
  type NewCompany,
  type NewCompanyAccessGrant,
  type NewFieldProvenance,
  type ProcedureStep,
  type ProcedureTemplate,
  type RuleCitation,
} from "@nationa/db";

import type { Db } from "../context";

export async function findCaseById(db: Db, caseId: string): Promise<Case | null> {
  const [row] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  return row ?? null;
}

export async function findTemplateById(
  db: Db,
  templateId: string,
): Promise<ProcedureTemplate | null> {
  const [row] = await db
    .select()
    .from(procedureTemplates)
    .where(eq(procedureTemplates.id, templateId))
    .limit(1);
  return row ?? null;
}

export async function findActiveTemplateById(
  db: Db,
  templateId: string,
): Promise<ProcedureTemplate | null> {
  const [row] = await db
    .select()
    .from(procedureTemplates)
    .where(and(eq(procedureTemplates.id, templateId), eq(procedureTemplates.active, true)))
    .limit(1);
  return row ?? null;
}

export async function listTemplateSteps(db: Db, templateId: string): Promise<ProcedureStep[]> {
  return db
    .select()
    .from(procedureSteps)
    .where(eq(procedureSteps.templateId, templateId))
    .orderBy(procedureSteps.position);
}

export async function listTemplateStepCitations(
  db: Db,
  stepIds: string[],
): Promise<Array<{ stepId: string; citation: RuleCitation }>> {
  if (stepIds.length === 0) {
    return [];
  }
  return db
    .select({ stepId: procedureStepCitations.stepId, citation: ruleCitations })
    .from(procedureStepCitations)
    .innerJoin(ruleCitations, eq(ruleCitations.id, procedureStepCitations.ruleCitationId))
    .where(inArray(procedureStepCitations.stepId, stepIds));
}

export async function findAgencyName(
  db: Db,
  agencyId: string,
): Promise<{ nameFr: string; nameAr: string | null } | null> {
  const [row] = await db
    .select({ nameFr: agencies.nameFr, nameAr: agencies.nameAr })
    .from(agencies)
    .where(eq(agencies.id, agencyId))
    .limit(1);
  return row ?? null;
}

export async function listCaseSteps(db: Db, caseId: string): Promise<CaseStep[]> {
  return db
    .select()
    .from(caseSteps)
    .where(eq(caseSteps.caseId, caseId))
    .orderBy(caseSteps.position);
}

export async function listCaseFieldValues(db: Db, caseId: string): Promise<CaseFieldValue[]> {
  return db
    .select()
    .from(caseFieldValues)
    .where(eq(caseFieldValues.caseId, caseId))
    .orderBy(caseFieldValues.fieldKey);
}

export async function listCaseFieldProvenance(
  db: Db,
  fieldIds: string[],
): Promise<FieldProvenance[]> {
  if (fieldIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(fieldProvenance)
    .where(
      and(
        eq(fieldProvenance.subjectType, "case_field"),
        inArray(fieldProvenance.subjectId, fieldIds),
      ),
    )
    .orderBy(desc(fieldProvenance.createdAt));
}

export async function listCaseDocuments(db: Db, caseId: string): Promise<Document[]> {
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.caseId, caseId), isNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt));
}

export async function listDocumentTypesByIds(db: Db, ids: string[]): Promise<DocumentType[]> {
  if (ids.length === 0) {
    return [];
  }
  return db.select().from(documentTypes).where(inArray(documentTypes.id, ids));
}

export async function listCaseSummaries(
  db: Db,
  input: { userId: string; companyId?: string; status?: Case["status"]; limit: number },
) {
  const conditions: SQL[] = [];
  if (input.companyId) {
    conditions.push(eq(cases.companyId, input.companyId));
  } else {
    conditions.push(
      or(eq(cases.createdByUserId, input.userId), eq(cases.assignedToUserId, input.userId)) ??
        sql`true`,
    );
  }
  if (input.status) {
    conditions.push(eq(cases.status, input.status));
  }

  return db
    .select({
      case: cases,
      templateId: procedureTemplates.id,
      templateCode: procedureTemplates.code,
      templateNameFr: procedureTemplates.nameFr,
      templateNameAr: procedureTemplates.nameAr,
      templateCategory: procedureTemplates.category,
      agencyId: procedureTemplates.agencyId,
      agencyNameFr: agencies.nameFr,
      agencyNameAr: agencies.nameAr,
    })
    .from(cases)
    .leftJoin(procedureTemplates, eq(procedureTemplates.id, cases.templateId))
    .leftJoin(agencies, eq(agencies.id, procedureTemplates.agencyId))
    .where(and(...conditions))
    .orderBy(desc(cases.updatedAt))
    .limit(input.limit);
}

export async function insertCase(db: Db, values: NewCase): Promise<Case | null> {
  const [row] = await db.insert(cases).values(values).returning();
  return row ?? null;
}

export async function insertCaseSteps(db: Db, values: NewCaseStep[]): Promise<void> {
  if (values.length === 0) {
    return;
  }
  await db.insert(caseSteps).values(values);
}

export async function upsertUserCaseFieldValue(
  db: Db,
  input: {
    caseId: string;
    stepId: string | null;
    fieldKey: string;
    valueText: string | null;
    valueJsonb: unknown;
    userId: string;
  },
): Promise<void> {
  const values = {
    valueText: input.valueText,
    valueJsonb: input.valueJsonb ?? null,
    sourceKind: "user" as const,
    sourceDocumentVersionId: null,
    extractionFieldId: null,
    aiProposalId: null,
    confidence: null,
    enteredByUserId: input.userId,
    stepId: input.stepId,
    updatedAt: new Date(),
  };
  await db
    .insert(caseFieldValues)
    .values({ caseId: input.caseId, fieldKey: input.fieldKey, ...values })
    .onConflictDoUpdate({
      target: [caseFieldValues.caseId, caseFieldValues.fieldKey],
      set: values,
    });
}

export async function claimAvailableCaseStep(
  db: Db,
  input: { caseId: string; stepId: string; startedAt: Date },
): Promise<CaseStep | null> {
  const [row] = await db
    .update(caseSteps)
    .set({ status: "in_progress", startedAt: input.startedAt })
    .where(
      and(
        eq(caseSteps.id, input.stepId),
        eq(caseSteps.caseId, input.caseId),
        eq(caseSteps.status, "available"),
      ),
    )
    .returning();
  return row ?? null;
}

export async function markLockedCaseStepInProgress(
  db: Db,
  input: { caseId: string; stepId: string },
): Promise<void> {
  await db
    .update(caseSteps)
    .set({ status: "in_progress" })
    .where(
      and(
        eq(caseSteps.id, input.stepId),
        eq(caseSteps.caseId, input.caseId),
        eq(caseSteps.status, "locked"),
      ),
    );
}

export async function updateCase(db: Db, caseId: string, values: Partial<NewCase>): Promise<void> {
  await db.update(cases).set(values).where(eq(cases.id, caseId));
}

export async function findCaseFieldSourceKind(
  db: Db,
  caseId: string,
  fieldKey: string,
): Promise<{ id: string; sourceKind: NewCaseFieldValue["sourceKind"] } | null> {
  const [row] = await db
    .select({ id: caseFieldValues.id, sourceKind: caseFieldValues.sourceKind })
    .from(caseFieldValues)
    .where(and(eq(caseFieldValues.caseId, caseId), eq(caseFieldValues.fieldKey, fieldKey)))
    .limit(1);
  return row ?? null;
}

export async function findCaseFieldValueByKey(
  db: Db,
  caseId: string,
  fieldKey: string,
): Promise<CaseFieldValue | null> {
  const [row] = await db
    .select()
    .from(caseFieldValues)
    .where(and(eq(caseFieldValues.caseId, caseId), eq(caseFieldValues.fieldKey, fieldKey)))
    .limit(1);
  return row ?? null;
}

export async function upsertAppliedCaseFieldValue(
  db: Db,
  input: {
    caseId: string;
    fieldKey: string;
    valueText: string | null;
    valueJsonb: unknown;
    sourceKind: NewCaseFieldValue["sourceKind"];
    sourceDocumentVersionId: string | null;
    extractionFieldId: string | null;
    aiProposalId: string | null;
    confidence: string | null;
    enteredByUserId: string | null;
  },
): Promise<CaseFieldValue | null> {
  const values = {
    valueText: input.valueText,
    valueJsonb: input.valueJsonb ?? null,
    sourceKind: input.sourceKind,
    sourceDocumentVersionId: input.sourceDocumentVersionId,
    extractionFieldId: input.extractionFieldId,
    aiProposalId: input.aiProposalId,
    confidence: input.confidence,
    enteredByUserId: input.enteredByUserId,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(caseFieldValues)
    .values({ caseId: input.caseId, fieldKey: input.fieldKey, ...values })
    .onConflictDoUpdate({
      target: [caseFieldValues.caseId, caseFieldValues.fieldKey],
      set: values,
    })
    .returning();
  return row ?? null;
}

export async function insertFieldProvenance(db: Db, rows: NewFieldProvenance[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.insert(fieldProvenance).values(rows);
}

export async function unlockNextCaseStep(db: Db, caseId: string, position: number): Promise<void> {
  await db
    .update(caseSteps)
    .set({ status: "available" })
    .where(
      and(
        eq(caseSteps.caseId, caseId),
        eq(caseSteps.position, position + 1),
        eq(caseSteps.status, "locked"),
      ),
    );
}

export async function listCaseStepStatuses(
  db: Db,
  caseId: string,
): Promise<Array<{ status: CaseStep["status"] }>> {
  return db
    .select({ status: caseSteps.status })
    .from(caseSteps)
    .where(eq(caseSteps.caseId, caseId));
}

export async function markCaseAwaitingReviewIfOpen(db: Db, caseId: string): Promise<void> {
  await db
    .update(cases)
    .set({ status: "awaiting_review" })
    .where(
      and(eq(cases.id, caseId), inArray(cases.status, ["draft", "in_progress", "awaiting_user"])),
    );
}

export async function findCaseStep(
  db: Db,
  stepId: string,
  caseId: string,
): Promise<CaseStep | null> {
  const [row] = await db
    .select()
    .from(caseSteps)
    .where(and(eq(caseSteps.id, stepId), eq(caseSteps.caseId, caseId)))
    .limit(1);
  return row ?? null;
}

export async function findProcedureStepById(db: Db, stepId: string): Promise<ProcedureStep | null> {
  const [row] = await db
    .select()
    .from(procedureSteps)
    .where(eq(procedureSteps.id, stepId))
    .limit(1);
  return row ?? null;
}

export async function updateCaseStep(
  db: Db,
  stepId: string,
  values: Partial<NewCaseStep>,
): Promise<void> {
  await db.update(caseSteps).set(values).where(eq(caseSteps.id, stepId));
}

export async function findDocumentForStep(
  db: Db,
  caseId: string,
  documentTypeId: string,
): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.caseId, caseId),
        eq(documents.documentTypeId, documentTypeId),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listCaseFieldValuesByKeys(
  db: Db,
  caseId: string,
  fieldKeys: string[],
): Promise<CaseFieldValue[]> {
  if (fieldKeys.length === 0) {
    return [];
  }
  return db
    .select()
    .from(caseFieldValues)
    .where(and(eq(caseFieldValues.caseId, caseId), inArray(caseFieldValues.fieldKey, fieldKeys)));
}

export async function listActiveFeesForTemplate(db: Db, templateId: string): Promise<Fee[]> {
  return db
    .select()
    .from(fees)
    .where(and(eq(fees.procedureTemplateId, templateId), eq(fees.active, true)));
}

export async function insertCompany(db: Db, values: NewCompany): Promise<Company | null> {
  const [row] = await db.insert(companies).values(values).returning();
  return row ?? null;
}

export async function updateCaseCompanyId(
  db: Db,
  caseId: string,
  companyId: string,
): Promise<void> {
  await db.update(cases).set({ companyId }).where(eq(cases.id, caseId));
}

export async function insertCompanyAccessGrant(
  db: Db,
  values: NewCompanyAccessGrant,
): Promise<void> {
  await db.insert(companyAccessGrants).values(values).onConflictDoNothing();
}
