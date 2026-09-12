import { eq, inArray } from "drizzle-orm";

import {
  agencies,
  documentTypes,
  procedureStepCitations,
  procedureSteps,
  procedureTemplates,
  ruleCitations,
} from "@nationa/db";

import type { Db } from "../context";

export async function listActiveProcedureTemplates(db: Db) {
  return db
    .select({
      id: procedureTemplates.id,
      agencyId: procedureTemplates.agencyId,
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
    .where(eq(procedureTemplates.active, true))
    .orderBy(procedureTemplates.agencyId, procedureTemplates.nameFr);
}

export async function listProcedureStepsByTemplateIds(db: Db, templateIds: string[]) {
  return db
    .select({ id: procedureSteps.id, templateId: procedureSteps.templateId })
    .from(procedureSteps)
    .where(inArray(procedureSteps.templateId, templateIds));
}

export async function findProcedureTemplate(db: Db, input: { id?: string; code?: string }) {
  const [template] = await db
    .select({
      id: procedureTemplates.id,
      agencyId: procedureTemplates.agencyId,
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
    .where(
      input.id
        ? eq(procedureTemplates.id, input.id)
        : eq(procedureTemplates.code, input.code ?? ""),
    )
    .limit(1);

  return template ?? null;
}

export async function listProcedureStepsByTemplate(db: Db, templateId: string) {
  return db
    .select()
    .from(procedureSteps)
    .where(eq(procedureSteps.templateId, templateId))
    .orderBy(procedureSteps.position);
}

export async function listProcedureStepCitations(db: Db, stepIds: string[]) {
  return db
    .select({ stepId: procedureStepCitations.stepId, citation: ruleCitations })
    .from(procedureStepCitations)
    .innerJoin(ruleCitations, eq(ruleCitations.id, procedureStepCitations.ruleCitationId))
    .where(inArray(procedureStepCitations.stepId, stepIds));
}

export async function listDocumentTypesByIds(db: Db, ids: string[]) {
  return db.select().from(documentTypes).where(inArray(documentTypes.id, ids));
}
