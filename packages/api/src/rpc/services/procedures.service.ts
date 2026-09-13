import { ORPCError } from "@orpc/server";

import type { RuleCitation } from "@nationa/db";

import type { Context } from "../context";
import type { ProcedureListItem, ProcedureStepDetail } from "../../domain/procedures";
import { parseFormSchema } from "../../domain/procedure-forms";
import { stepGuidance } from "../../domain/step-guidance";
import {
  findProcedureTemplate,
  listActiveProcedureTemplates,
  listDocumentTypesByIds,
  listProcedureStepCitations,
  listProcedureStepsByTemplate,
  listProcedureStepsByTemplateIds,
} from "../repositories/procedures.repo";

export type { ProcedureListItem, ProcedureStepDetail } from "../../domain/procedures";

export async function listProcedures(context: Context): Promise<ProcedureListItem[]> {
  const templates = await listActiveProcedureTemplates(context.db);

  if (templates.length === 0) {
    return [];
  }

  const stepRows = await listProcedureStepsByTemplateIds(
    context.db,
    templates.map((template) => template.id),
  );

  const stepCounts = new Map<string, number>();
  for (const step of stepRows) {
    stepCounts.set(step.templateId, (stepCounts.get(step.templateId) ?? 0) + 1);
  }

  return templates
    .map((template) => ({
      ...template,
      stepCount: stepCounts.get(template.id) ?? 0,
    }))
    .filter((template) => (stepCounts.get(template.id) ?? 0) > 0);
}

export async function getProcedure(
  context: Context,
  input: { id?: string; code?: string },
): Promise<{ template: ProcedureListItem; steps: ProcedureStepDetail[] }> {
  if (!input.id && !input.code) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Provide a procedure id or code",
    });
  }

  const template = await findProcedureTemplate(context.db, input);

  if (!template) {
    throw new ORPCError("NOT_FOUND", { message: "Procedure template not found" });
  }

  const steps = await listProcedureStepsByTemplate(context.db, template.id);

  const stepIds = steps.map((step) => step.id);
  const citationRows =
    stepIds.length > 0 ? await listProcedureStepCitations(context.db, stepIds) : [];

  const citationsByStep = new Map<string, RuleCitation[]>();
  for (const row of citationRows) {
    const list = citationsByStep.get(row.stepId) ?? [];
    list.push(row.citation);
    citationsByStep.set(row.stepId, list);
  }

  const documentTypeIds = steps
    .map((step) => step.requiredDocumentTypeId)
    .filter((id): id is string => typeof id === "string");
  const documentTypeRows =
    documentTypeIds.length > 0 ? await listDocumentTypesByIds(context.db, documentTypeIds) : [];
  const documentTypesById = new Map<string, (typeof documentTypeRows)[number]>();
  for (const row of documentTypeRows) {
    documentTypesById.set(row.id, row);
  }

  const detailSteps: ProcedureStepDetail[] = steps.map((step, index) => {
    const requiredType = step.requiredDocumentTypeId
      ? documentTypesById.get(step.requiredDocumentTypeId)
      : undefined;
    return {
      id: step.id,
      templateId: step.templateId,
      position: index + 1,
      code: step.code,
      titleFr: step.titleFr,
      titleAr: step.titleAr,
      description: stepGuidance(template.code, step.code, step.description),
      stepType: step.stepType,
      requiredDocumentTypeId: step.requiredDocumentTypeId,
      isOptional: step.isOptional,
      formSchema: parseFormSchema(step.formSchema),
      citations: citationsByStep.get(step.id) ?? [],
      requiredDocumentType: requiredType
        ? {
            id: requiredType.id,
            code: requiredType.code,
            nameFr: requiredType.nameFr,
            nameAr: requiredType.nameAr,
            description: requiredType.description,
            acceptedMimeTypes: requiredType.acceptedMimeTypes,
          }
        : null,
    };
  });

  return {
    template: { ...template, stepCount: detailSteps.length },
    steps: detailSteps,
  };
}
