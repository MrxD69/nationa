import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";

import {
  agencies,
  caseFieldValues,
  caseSteps,
  cases,
  checkRuns,
  documentTypes,
  documentVersions,
  documents,
  fees,
  findings,
  procedureStepCitations,
  procedureSteps,
  procedureTemplates,
  ruleCitations,
  submissions,
  type Case,
  type CaseStep,
} from "@nationa/db";

import type { Db } from "../context";

export async function listCatalogTemplates(db: Db, agencyId?: string) {
  const conditions: SQL[] = [eq(procedureTemplates.active, true)];
  if (agencyId) {
    conditions.push(eq(procedureTemplates.agencyId, agencyId));
  }

  return db
    .select({
      id: procedureTemplates.id,
      agencyId: procedureTemplates.agencyId,
      obligationId: procedureTemplates.obligationId,
      code: procedureTemplates.code,
      nameFr: procedureTemplates.nameFr,
      nameAr: procedureTemplates.nameAr,
      description: procedureTemplates.description,
      category: procedureTemplates.category,
      estimatedDays: procedureTemplates.estimatedDays,
      agencyNameFr: agencies.nameFr,
      agencyNameAr: agencies.nameAr,
    })
    .from(procedureTemplates)
    .leftJoin(agencies, eq(agencies.id, procedureTemplates.agencyId))
    .where(and(...conditions))
    .orderBy(procedureTemplates.agencyId, procedureTemplates.nameFr);
}

export async function listTemplateStepFacts(db: Db, templateIds: string[]) {
  if (templateIds.length === 0) {
    return [];
  }
  return db
    .select({
      id: procedureSteps.id,
      templateId: procedureSteps.templateId,
      position: procedureSteps.position,
      stepType: procedureSteps.stepType,
      requiredDocumentTypeId: procedureSteps.requiredDocumentTypeId,
    })
    .from(procedureSteps)
    .where(inArray(procedureSteps.templateId, templateIds))
    .orderBy(procedureSteps.position);
}

export async function findTemplateDetailed(db: Db, input: { templateId?: string; code?: string }) {
  const [row] = await db
    .select({
      id: procedureTemplates.id,
      agencyId: procedureTemplates.agencyId,
      obligationId: procedureTemplates.obligationId,
      code: procedureTemplates.code,
      nameFr: procedureTemplates.nameFr,
      nameAr: procedureTemplates.nameAr,
      description: procedureTemplates.description,
      category: procedureTemplates.category,
      estimatedDays: procedureTemplates.estimatedDays,
      active: procedureTemplates.active,
      agencyNameFr: agencies.nameFr,
      agencyNameAr: agencies.nameAr,
    })
    .from(procedureTemplates)
    .leftJoin(agencies, eq(agencies.id, procedureTemplates.agencyId))
    .where(
      input.templateId
        ? eq(procedureTemplates.id, input.templateId)
        : eq(procedureTemplates.code, input.code ?? ""),
    )
    .limit(1);
  return row ?? null;
}

export async function listTemplateStepsDetailed(db: Db, templateId: string) {
  return db
    .select({ step: procedureSteps, documentType: documentTypes })
    .from(procedureSteps)
    .leftJoin(documentTypes, eq(procedureSteps.requiredDocumentTypeId, documentTypes.id))
    .where(eq(procedureSteps.templateId, templateId))
    .orderBy(procedureSteps.position);
}

export async function listStepCitations(db: Db, stepIds: string[]) {
  if (stepIds.length === 0) {
    return [];
  }
  return db
    .select({ stepId: procedureStepCitations.stepId, citation: ruleCitations })
    .from(procedureStepCitations)
    .innerJoin(ruleCitations, eq(ruleCitations.id, procedureStepCitations.ruleCitationId))
    .where(inArray(procedureStepCitations.stepId, stepIds));
}

export async function findCaseById(db: Db, caseId: string): Promise<Case | null> {
  const [row] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  return row ?? null;
}

export async function listCaseSteps(db: Db, caseId: string): Promise<CaseStep[]> {
  return db
    .select()
    .from(caseSteps)
    .where(eq(caseSteps.caseId, caseId))
    .orderBy(caseSteps.position);
}

export async function listCaseFields(db: Db, caseId: string) {
  return db
    .select()
    .from(caseFieldValues)
    .where(eq(caseFieldValues.caseId, caseId))
    .orderBy(caseFieldValues.fieldKey);
}

export async function listCaseDocumentsWithVersion(db: Db, caseId: string) {
  return db
    .select({ document: documents, version: documentVersions })
    .from(documents)
    .leftJoin(documentVersions, eq(documents.currentVersionId, documentVersions.id))
    .where(and(eq(documents.caseId, caseId), isNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt));
}

export async function listCaseDocumentVersions(db: Db, caseId: string) {
  return db
    .select({
      id: documentVersions.id,
      documentId: documentVersions.documentId,
      source: documentVersions.source,
      documentTypeId: documents.documentTypeId,
    })
    .from(documentVersions)
    .innerJoin(documents, eq(documentVersions.documentId, documents.id))
    .where(eq(documents.caseId, caseId));
}

export async function findLatestCaseRun(db: Db, caseId: string) {
  const [run] = await db
    .select()
    .from(checkRuns)
    .where(and(eq(checkRuns.subjectType, "case"), eq(checkRuns.subjectId, caseId)))
    .orderBy(desc(checkRuns.createdAt))
    .limit(1);
  return run ?? null;
}

export async function listFindingsByRun(db: Db, runId: string) {
  return db
    .select()
    .from(findings)
    .where(eq(findings.checkRunId, runId))
    .orderBy(desc(findings.severity), desc(findings.createdAt));
}

export async function listCaseSubmissions(db: Db, caseId: string) {
  return db
    .select()
    .from(submissions)
    .where(and(eq(submissions.caseId, caseId), isNull(submissions.deletedAt)))
    .orderBy(desc(submissions.createdAt));
}

export async function listActiveTemplateFees(db: Db, templateId: string) {
  return db
    .select()
    .from(fees)
    .where(and(eq(fees.procedureTemplateId, templateId), eq(fees.active, true)));
}

export async function listCompanyCasesForTemplates(
  db: Db,
  companyId: string,
  templateIds: string[],
) {
  if (templateIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(cases)
    .where(and(eq(cases.companyId, companyId), inArray(cases.templateId, templateIds)))
    .orderBy(desc(cases.updatedAt));
}

export async function listCaseStepsForCases(db: Db, caseIds: string[]) {
  if (caseIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(caseSteps)
    .where(inArray(caseSteps.caseId, caseIds))
    .orderBy(caseSteps.position);
}

export async function findOpenCaseForTemplate(
  db: Db,
  input: { templateId: string; userId: string; companyId?: string },
): Promise<Case | null> {
  const conditions: SQL[] = [
    eq(cases.templateId, input.templateId),
    inArray(cases.status, ["draft", "in_progress", "awaiting_user"]),
  ];
  if (input.companyId) {
    conditions.push(eq(cases.companyId, input.companyId));
  } else {
    conditions.push(eq(cases.createdByUserId, input.userId));
  }

  const [row] = await db
    .select()
    .from(cases)
    .where(and(...conditions))
    .orderBy(desc(cases.updatedAt))
    .limit(1);
  return row ?? null;
}
