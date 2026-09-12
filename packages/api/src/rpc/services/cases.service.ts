import { ORPCError } from "@orpc/server";

import type {
  Address,
  Case,
  CaseFieldValue,
  JsonObject,
  NewCompany,
  ProcedureStep,
  ProcedureTemplate,
  RuleCitation,
} from "@nationa/db";

import { assertCompanyPermission, requireUser } from "../../auth/access";
import { assertCaseAccess, assertCasePermission } from "../../auth/case-access";
import { COMPANY_FIELD_KEYS, normalizeFieldKey, type CanonicalFieldKey } from "../../domain/fields";
import { parseFormSchema } from "../../domain/procedure-forms";
import type { CompanyPermission } from "../../permissions";
import type { Context } from "../context";
import * as repo from "../repositories/cases.repo";
import { emitCaseEvent, listCaseActivity } from "./case-activity.service";
import { createSubmissionFromCase } from "./submissions.service";

const CASE_STATUSES = [
  "draft",
  "in_progress",
  "awaiting_user",
  "awaiting_review",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
] as const;

const COMPANY_FIELD_KEY_SET = new Set<string>(COMPANY_FIELD_KEYS);
const REGISTRY_STATES = new Set(["actif", "suspendu", "radie"]);
const REGISTRY_TYPES = new Set(["societe", "entreprise"]);
const FISCAL_DEFAULTS = new Set(["none", "months_12_24", "over_24_months", "unknown"]);

export type CaseStatus = (typeof CASE_STATUSES)[number];

export type FieldEntry = {
  key: string;
  valueText?: string | null;
  valueJsonb?: unknown;
};

export type ApplyFieldEntry = {
  fieldKey: string;
  valueText?: string | null;
  valueJsonb?: unknown;
  sourceKind: "document" | "ai" | "system";
  sourceDocumentVersionId?: string | null;
  extractionFieldId?: string | null;
  aiProposalId?: string | null;
  confidence?: number | null;
};

function toNumeric(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return value.toFixed(2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasValue(value: { valueText: string | null; valueJsonb: unknown }): boolean {
  if (typeof value.valueText === "string" && value.valueText.trim().length > 0) {
    return true;
  }
  if (value.valueJsonb === null || value.valueJsonb === undefined) {
    return false;
  }
  if (typeof value.valueJsonb === "string") {
    return value.valueJsonb.trim().length > 0;
  }
  if (Array.isArray(value.valueJsonb)) {
    return value.valueJsonb.length > 0;
  }
  if (isRecord(value.valueJsonb)) {
    return Object.keys(value.valueJsonb).length > 0;
  }
  return true;
}

function primaryText(field: CaseFieldValue | undefined): string | null {
  if (!field) {
    return null;
  }
  if (typeof field.valueText === "string" && field.valueText.length > 0) {
    return field.valueText;
  }
  if (isRecord(field.valueJsonb) && typeof field.valueJsonb.raw === "string") {
    return field.valueJsonb.raw;
  }
  if (typeof field.valueJsonb === "number" || typeof field.valueJsonb === "boolean") {
    return String(field.valueJsonb);
  }
  return null;
}

function asAddress(field: CaseFieldValue | undefined): Address | undefined {
  if (!field) {
    return undefined;
  }
  if (isRecord(field.valueJsonb)) {
    return field.valueJsonb as Address;
  }
  const raw = primaryText(field);
  return raw ? { raw } : undefined;
}

function asNumber(field: CaseFieldValue | undefined): number | null {
  const raw = primaryText(field);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(field: CaseFieldValue | undefined): boolean | undefined {
  if (!field) {
    return undefined;
  }
  if (typeof field.valueJsonb === "boolean") {
    return field.valueJsonb;
  }
  const raw = primaryText(field)?.toLowerCase();
  if (raw === "true" || raw === "1" || raw === "oui" || raw === "yes" || raw === "نعم") {
    return true;
  }
  if (raw === "false" || raw === "0" || raw === "non" || raw === "no" || raw === "لا") {
    return false;
  }
  return undefined;
}

async function loadCaseOrThrow(context: Context, caseId: string): Promise<Case> {
  const caseRecord = await repo.findCaseById(context.db, caseId);
  if (!caseRecord) {
    throw new ORPCError("NOT_FOUND", { message: "Case not found" });
  }
  return caseRecord;
}

export async function assertCaseIdAccess(context: Context, caseId: string): Promise<Case> {
  const caseRecord = await loadCaseOrThrow(context, caseId);
  await assertCaseAccess(context, caseRecord);
  return caseRecord;
}

export async function requireCasePermission(
  context: Context,
  caseId: string,
  permission: CompanyPermission,
): Promise<Case> {
  requireUser(context);
  const caseRecord = await loadCaseOrThrow(context, caseId);
  await assertCasePermission(context, caseRecord, permission);
  return caseRecord;
}

async function loadCaseContext(
  context: Context,
  caseId: string,
): Promise<{ caseRecord: Case; template: ProcedureTemplate }> {
  const caseRecord = await loadCaseOrThrow(context, caseId);
  const template = await repo.findTemplateById(context.db, caseRecord.templateId);
  if (!template) {
    throw new ORPCError("NOT_FOUND", { message: "Procedure template not found" });
  }
  return { caseRecord, template };
}

async function loadCitationsByStep(
  context: Context,
  stepIds: string[],
): Promise<Map<string, RuleCitation[]>> {
  const rows = await repo.listTemplateStepCitations(context.db, stepIds);
  const grouped = new Map<string, RuleCitation[]>();
  for (const row of rows) {
    const list = grouped.get(row.stepId) ?? [];
    list.push(row.citation);
    grouped.set(row.stepId, list);
  }
  return grouped;
}

export async function getCaseDetail(context: Context, caseId: string) {
  const { caseRecord, template } = await loadCaseContext(context, caseId);
  await assertCaseAccess(context, caseRecord);

  const agency = await repo.findAgencyName(context.db, template.agencyId);

  const templateSteps = await repo.listTemplateSteps(context.db, template.id);
  const templateStepIds = templateSteps.map((step) => step.id);
  const templateStepsById = new Map<string, ProcedureStep>();
  for (const step of templateSteps) {
    templateStepsById.set(step.id, step);
  }
  const citationsByStep = await loadCitationsByStep(context, templateStepIds);

  const caseStepRows = await repo.listCaseSteps(context.db, caseId);
  const fieldRows = await repo.listCaseFieldValues(context.db, caseId);

  const fieldIds = fieldRows.map((field) => field.id);
  const provenanceRows = await repo.listCaseFieldProvenance(context.db, fieldIds);

  const provenanceByField = new Map<string, typeof provenanceRows>();
  for (const row of provenanceRows) {
    const list = provenanceByField.get(row.subjectId) ?? [];
    list.push(row);
    provenanceByField.set(row.subjectId, list);
  }

  const documentRows = await repo.listCaseDocuments(context.db, caseId);

  const documentTypeIds = new Set<string>();
  for (const step of templateSteps) {
    if (step.requiredDocumentTypeId) {
      documentTypeIds.add(step.requiredDocumentTypeId);
    }
  }
  for (const document of documentRows) {
    if (document.documentTypeId) {
      documentTypeIds.add(document.documentTypeId);
    }
  }
  const documentTypeRows = await repo.listDocumentTypesByIds(context.db, [...documentTypeIds]);
  const documentTypesById = new Map<string, (typeof documentTypeRows)[number]>();
  for (const row of documentTypeRows) {
    documentTypesById.set(row.id, row);
  }

  const steps = caseStepRows.map((caseStep) => {
    const templateStep = caseStep.templateStepId
      ? templateStepsById.get(caseStep.templateStepId)
      : undefined;
    const requiredTypeId = templateStep?.requiredDocumentTypeId ?? null;
    return {
      ...caseStep,
      template: templateStep ?? null,
      formSchema: parseFormSchema(templateStep?.formSchema),
      citations: templateStep ? (citationsByStep.get(templateStep.id) ?? []) : [],
      requiredDocumentType: requiredTypeId ? (documentTypesById.get(requiredTypeId) ?? null) : null,
    };
  });

  const fields = fieldRows.map((field) => ({
    ...field,
    provenance: provenanceByField.get(field.id) ?? [],
  }));

  return {
    case: caseRecord,
    template: {
      id: template.id,
      agencyId: template.agencyId,
      agencyNameFr: agency?.nameFr ?? null,
      agencyNameAr: agency?.nameAr ?? null,
      code: template.code,
      nameFr: template.nameFr,
      nameAr: template.nameAr,
      description: template.description,
      category: template.category,
      estimatedDays: template.estimatedDays,
    },
    steps,
    fields,
    documents: documentRows,
    documentTypes: documentTypeRows,
  };
}

export async function startCase(
  context: Context,
  input: {
    templateId: string;
    companyId?: string;
    applicantPersonId?: string;
    title?: string;
  },
) {
  const user = requireUser(context);

  const template = await repo.findActiveTemplateById(context.db, input.templateId);
  if (!template) {
    throw new ORPCError("NOT_FOUND", { message: "Procedure template not found" });
  }

  if (input.companyId) {
    await assertCompanyPermission(context, input.companyId, "cases.write");
  }

  const created = await repo.insertCase(context.db, {
    templateId: template.id,
    companyId: input.companyId ?? null,
    applicantPersonId: input.applicantPersonId ?? null,
    createdByUserId: user.id,
    title: input.title?.trim() || template.nameFr,
    status: "draft",
    context: {},
  });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create case" });
  }

  const templateSteps = await repo.listTemplateSteps(context.db, template.id);
  if (templateSteps.length > 0) {
    await repo.insertCaseSteps(
      context.db,
      templateSteps.map((_, index) => ({
        caseId: created.id,
        templateStepId: templateSteps[index]?.id ?? null,
        position: index + 1,
        status: index === 0 ? ("available" as const) : ("locked" as const),
      })),
    );
  }

  await emitCaseEvent(context, {
    caseId: created.id,
    companyId: created.companyId,
    action: "case.created",
    summary: `Case started for ${template.nameFr}`,
    data: { templateId: template.id, templateCode: template.code },
  });

  return getCaseDetail(context, created.id);
}

export async function listCases(
  context: Context,
  input: { companyId?: string; status?: CaseStatus; limit?: number },
) {
  const user = requireUser(context);
  const limit = input.limit ?? 50;

  if (input.companyId) {
    await assertCompanyPermission(context, input.companyId, "cases.read");
  }

  const rows = await repo.listCaseSummaries(context.db, {
    userId: user.id,
    companyId: input.companyId,
    status: input.status,
    limit,
  });

  return rows.map((row) => ({
    ...row.case,
    procedure: {
      id: row.templateId,
      code: row.templateCode,
      nameFr: row.templateNameFr,
      nameAr: row.templateNameAr,
      category: row.templateCategory,
      agencyId: row.agencyId,
      agencyNameFr: row.agencyNameFr,
      agencyNameAr: row.agencyNameAr,
    },
  }));
}

export async function saveStepFields(
  context: Context,
  input: { caseId: string; stepId?: string; fields: FieldEntry[] },
) {
  const user = requireUser(context);
  const caseRecord = await assertCaseIdAccess(context, input.caseId);

  const resolved: Array<{ key: CanonicalFieldKey; entry: FieldEntry }> = [];
  const unknownKeys: string[] = [];
  for (const entry of input.fields) {
    const key = normalizeFieldKey(entry.key);
    if (!key) {
      unknownKeys.push(entry.key);
      continue;
    }
    resolved.push({ key, entry });
  }
  if (unknownKeys.length > 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Unknown field keys",
      data: { fieldKeys: unknownKeys },
    });
  }

  for (const { key, entry } of resolved) {
    await repo.upsertUserCaseFieldValue(context.db, {
      caseId: input.caseId,
      stepId: input.stepId ?? null,
      fieldKey: key,
      valueText: entry.valueText ?? null,
      valueJsonb: entry.valueJsonb ?? null,
      userId: user.id,
    });
  }

  if (input.stepId) {
    const updatedStep = await repo.claimAvailableCaseStep(context.db, {
      caseId: input.caseId,
      stepId: input.stepId,
      startedAt: new Date(),
    });
    if (!updatedStep) {
      await repo.markLockedCaseStepInProgress(context.db, {
        caseId: input.caseId,
        stepId: input.stepId,
      });
    }
  }

  if (caseRecord.status === "draft") {
    await repo.updateCase(context.db, input.caseId, { status: "in_progress" });
  }

  await emitCaseEvent(context, {
    caseId: input.caseId,
    companyId: caseRecord.companyId,
    action: "case.field_saved",
    summary: `Saved ${resolved.length} field(s)`,
    data: { stepId: input.stepId ?? null, fieldKeys: resolved.map((item) => item.key) },
  });

  return { saved: resolved.length };
}

export async function applyCaseFields(
  context: Context,
  input: { caseId: string; entries: ApplyFieldEntry[]; mode?: "merge" | "overwrite" },
) {
  const mode = input.mode ?? "merge";
  const caseRecord = await loadCaseOrThrow(context, input.caseId);
  const userId = context.user?.id ?? null;

  let applied = 0;
  let skipped = 0;

  for (const entry of input.entries) {
    const fieldKey = normalizeFieldKey(entry.fieldKey);
    if (!fieldKey) {
      skipped += 1;
      continue;
    }

    const existing = await repo.findCaseFieldSourceKind(context.db, input.caseId, fieldKey);

    if (mode === "merge" && existing?.sourceKind === "user") {
      skipped += 1;
      continue;
    }

    const confidence = toNumeric(entry.confidence ?? null);
    const row = await repo.upsertAppliedCaseFieldValue(context.db, {
      caseId: input.caseId,
      fieldKey,
      valueText: entry.valueText ?? null,
      valueJsonb: entry.valueJsonb ?? null,
      sourceKind: entry.sourceKind,
      sourceDocumentVersionId: entry.sourceDocumentVersionId ?? null,
      extractionFieldId: entry.extractionFieldId ?? null,
      aiProposalId: entry.aiProposalId ?? null,
      confidence,
      enteredByUserId: userId,
    });

    if (!row) {
      continue;
    }

    await repo.insertFieldProvenance(context.db, [
      {
        subjectType: "case_field",
        subjectId: row.id,
        fieldKey,
        sourceKind: entry.sourceKind,
        sourceDocumentVersionId: entry.sourceDocumentVersionId ?? null,
        extractionFieldId: entry.extractionFieldId ?? null,
        aiProposalId: entry.aiProposalId ?? null,
        confidence,
        enteredByUserId: userId,
      },
    ]);

    applied += 1;
  }

  await emitCaseEvent(context, {
    caseId: input.caseId,
    companyId: caseRecord.companyId,
    actorType: context.user ? "user" : "system",
    action: "case.field_applied",
    summary: `Applied ${applied} field(s) (${mode})`,
    data: { mode, applied, skipped },
  });

  return { applied, skipped };
}

async function unlockNextStep(context: Context, caseId: string, position: number): Promise<void> {
  await repo.unlockNextCaseStep(context.db, caseId, position);
}

async function markCaseCompleteIfDone(context: Context, caseId: string): Promise<void> {
  const steps = await repo.listCaseStepStatuses(context.db, caseId);
  if (steps.length === 0) {
    return;
  }
  const allDone = steps.every((step) => step.status === "completed" || step.status === "skipped");
  if (allDone) {
    await repo.markCaseAwaitingReviewIfOpen(context.db, caseId);
  }
}

async function validateStepRequirements(
  context: Context,
  caseId: string,
  templateStep: ProcedureStep | undefined,
): Promise<void> {
  if (!templateStep) {
    return;
  }

  if (templateStep.stepType === "upload" && templateStep.requiredDocumentTypeId) {
    const document = await repo.findDocumentForStep(
      context.db,
      caseId,
      templateStep.requiredDocumentTypeId,
    );
    if (!document) {
      throw new ORPCError("BAD_REQUEST", {
        message: "A required document has not been uploaded for this step",
        data: { stepId: templateStep.id },
      });
    }
  }

  if (templateStep.stepType === "form") {
    const schema = parseFormSchema(templateStep.formSchema);
    const requiredKeys = schema.fields.filter((field) => field.required).map((field) => field.key);
    if (requiredKeys.length > 0) {
      const rows = await repo.listCaseFieldValuesByKeys(context.db, caseId, requiredKeys);
      const valuesByKey = new Map<string, CaseFieldValue>();
      for (const row of rows) {
        valuesByKey.set(row.fieldKey, row);
      }
      const missing = requiredKeys.filter((key) => {
        const value = valuesByKey.get(key);
        return !value || !hasValue(value);
      });
      if (missing.length > 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Required fields are missing",
          data: { stepId: templateStep.id, fieldKeys: missing },
        });
      }
    }
  }
}

export async function completeStep(context: Context, input: { caseId: string; stepId: string }) {
  const caseRecord = await assertCaseIdAccess(context, input.caseId);

  const caseStep = await repo.findCaseStep(context.db, input.stepId, input.caseId);
  if (!caseStep) {
    throw new ORPCError("NOT_FOUND", { message: "Case step not found" });
  }

  const templateStep = caseStep.templateStepId
    ? await repo.findProcedureStepById(context.db, caseStep.templateStepId)
    : null;

  await validateStepRequirements(context, input.caseId, templateStep ?? undefined);

  await repo.updateCaseStep(context.db, caseStep.id, {
    status: "completed",
    completedAt: new Date(),
  });

  await unlockNextStep(context, input.caseId, caseStep.position);
  await markCaseCompleteIfDone(context, input.caseId);

  await emitCaseEvent(context, {
    caseId: input.caseId,
    companyId: caseRecord.companyId,
    action: "case.step_completed",
    summary: `Completed step ${caseStep.position}`,
    data: { stepId: input.stepId, templateStepId: caseStep.templateStepId },
  });

  return getCaseDetail(context, input.caseId);
}

export async function skipStep(context: Context, input: { caseId: string; stepId: string }) {
  const caseRecord = await assertCaseIdAccess(context, input.caseId);

  const caseStep = await repo.findCaseStep(context.db, input.stepId, input.caseId);
  if (!caseStep) {
    throw new ORPCError("NOT_FOUND", { message: "Case step not found" });
  }

  const templateStep = caseStep.templateStepId
    ? await repo.findProcedureStepById(context.db, caseStep.templateStepId)
    : null;
  if (!templateStep?.isOptional) {
    throw new ORPCError("BAD_REQUEST", { message: "This step cannot be skipped" });
  }

  await repo.updateCaseStep(context.db, caseStep.id, {
    status: "skipped",
    completedAt: new Date(),
  });

  await unlockNextStep(context, input.caseId, caseStep.position);
  await markCaseCompleteIfDone(context, input.caseId);

  await emitCaseEvent(context, {
    caseId: input.caseId,
    companyId: caseRecord.companyId,
    action: "case.step_skipped",
    summary: `Skipped step ${caseStep.position}`,
    data: { stepId: input.stepId },
  });

  return getCaseDetail(context, input.caseId);
}

function resolveFeeAmount(
  fee: { amount: string; logic: JsonObject | null },
  capitalAmount: number | null,
): number {
  const logic = fee.logic ?? {};
  if (logic.type === "percentage_of_capital" && capitalAmount !== null) {
    const rate = typeof logic.rate === "number" ? logic.rate : 0;
    const min = typeof logic.min === "number" ? logic.min : 0;
    const max = typeof logic.max === "number" ? logic.max : Number.POSITIVE_INFINITY;
    return Math.min(Math.max(capitalAmount * rate, min), max);
  }
  const parsed = Number(fee.amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function previewPayment(context: Context, input: { caseId: string }) {
  const { caseRecord, template } = await loadCaseContext(context, input.caseId);
  await assertCaseAccess(context, caseRecord);

  const feeRows = await repo.listActiveFeesForTemplate(context.db, template.id);

  const capitalField = await repo.findCaseFieldValueByKey(
    context.db,
    input.caseId,
    "capitalAmount",
  );
  const capitalAmount = asNumber(capitalField ?? undefined);

  const items = feeRows.map((fee) => ({
    feeId: fee.id,
    label: fee.label,
    amount: resolveFeeAmount({ amount: fee.amount, logic: fee.logic }, capitalAmount),
    currency: fee.currency,
  }));
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const currency = items[0]?.currency ?? "TND";

  return {
    caseId: input.caseId,
    currency,
    total,
    items,
    payable: Boolean(caseRecord.companyId),
  };
}

async function materializeCompanyFromCase(
  context: Context,
  caseRecord: Case,
  template: ProcedureTemplate,
): Promise<string> {
  const fieldRows = await repo.listCaseFieldValues(context.db, caseRecord.id);
  const fieldsByKey = new Map<string, CaseFieldValue>();
  for (const row of fieldRows) {
    fieldsByKey.set(row.fieldKey, row);
  }

  const readText = (key: CanonicalFieldKey): string | null => primaryText(fieldsByKey.get(key));
  const readAddress = (key: CanonicalFieldKey): Address | undefined =>
    asAddress(fieldsByKey.get(key));

  const values: NewCompany = {
    legalName: readText("legalName") ?? caseRecord.title,
    legalNameAr: readText("legalNameAr"),
    tradeName: readText("tradeName"),
    brandName: readText("brandName"),
    legalForm: readText("legalForm"),
    capitalAmount: readText("capitalAmount")
      ? String(asNumber(fieldsByKey.get("capitalAmount")) ?? readText("capitalAmount"))
      : null,
    currency: readText("currency") ?? "TND",
    durationYears: asNumber(fieldsByKey.get("durationYears")),
    publicationDate: readText("publicationDate"),
    headquartersAddress: readAddress("headquartersAddress"),
    activityAddress: readAddress("activityAddress"),
    mainActivityLabel: readText("mainActivityLabel"),
    mainActivityLabelAr: readText("mainActivityLabelAr"),
    mainActivityCode: readText("mainActivityCode"),
    activityStartDate: readText("activityStartDate"),
    secondaryEstablishmentsCount: asNumber(fieldsByKey.get("secondaryEstablishmentsCount")),
    leasing: asBoolean(fieldsByKey.get("leasing")) ?? false,
    hasPledge: asBoolean(fieldsByKey.get("hasPledge")) ?? false,
    mentionDate: readText("mentionDate"),
    uniqueIdentifier: readText("uniqueIdentifier"),
    internalManagementNumber: readText("internalManagementNumber"),
    taxId: readText("taxId"),
    status: "draft",
    createdByUserId: caseRecord.createdByUserId ?? context.user?.id ?? null,
  };

  const registryState = readText("registryState");
  if (registryState && REGISTRY_STATES.has(registryState)) {
    values.registryState = registryState as NonNullable<NewCompany["registryState"]>;
  }
  const registryType = readText("registryType");
  if (registryType && REGISTRY_TYPES.has(registryType)) {
    values.registryType = registryType as NonNullable<NewCompany["registryType"]>;
  }
  const fiscalDefault = readText("fiscalDefault");
  if (fiscalDefault && FISCAL_DEFAULTS.has(fiscalDefault)) {
    values.fiscalDefault = fiscalDefault as NonNullable<NewCompany["fiscalDefault"]>;
  }

  const company = await repo.insertCompany(context.db, values);
  if (!company) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to materialize company" });
  }

  await repo.updateCaseCompanyId(context.db, caseRecord.id, company.id);

  const ownerUserId = caseRecord.createdByUserId ?? context.user?.id ?? null;
  if (ownerUserId) {
    await repo.insertCompanyAccessGrant(context.db, {
      companyId: company.id,
      userId: ownerUserId,
      role: "owner",
      scopes: [],
      status: "active",
      grantedBy: context.user?.id ?? ownerUserId,
    });
  }

  const companyFieldRows = fieldRows.filter((row) => COMPANY_FIELD_KEY_SET.has(row.fieldKey));
  await repo.insertFieldProvenance(
    context.db,
    companyFieldRows.map((row) => ({
      subjectType: "company" as const,
      subjectId: company.id,
      fieldKey: row.fieldKey,
      sourceKind: row.sourceKind,
      sourceDocumentVersionId: row.sourceDocumentVersionId,
      extractionFieldId: row.extractionFieldId,
      aiProposalId: row.aiProposalId,
      confidence: row.confidence,
      enteredByUserId: row.enteredByUserId,
    })),
  );

  await emitCaseEvent(context, {
    caseId: caseRecord.id,
    companyId: company.id,
    action: "case.company_materialized",
    summary: `Company ${company.legalName} created from case (${template.code})`,
    data: { companyId: company.id, templateId: template.id },
  });

  return company.id;
}

export async function submitCase(context: Context, input: { caseId: string }) {
  const user = requireUser(context);
  const { caseRecord, template } = await loadCaseContext(context, input.caseId);
  await assertCaseAccess(context, caseRecord);

  if (caseRecord.status === "submitted" || caseRecord.status === "approved") {
    throw new ORPCError("BAD_REQUEST", { message: "Case has already been submitted" });
  }

  const templateSteps = await repo.listTemplateSteps(context.db, template.id);
  const caseStepRows = await repo.listCaseSteps(context.db, input.caseId);

  const incomplete = templateSteps.filter((templateStep) => {
    if (templateStep.isOptional) {
      return false;
    }
    const caseStep = caseStepRows.find((row) => row.templateStepId === templateStep.id);
    return !caseStep || caseStep.status !== "completed";
  });
  if (incomplete.length > 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "All required steps must be completed before submitting",
      data: { stepIds: incomplete.map((step) => step.id) },
    });
  }

  if (!caseRecord.companyId || template.category === "creation") {
    await materializeCompanyFromCase(context, caseRecord, template);
  }

  const result = await createSubmissionFromCase(context, {
    caseId: input.caseId,
    submittedByUserId: user.id,
    acknowledgeBlockers: true,
  });

  await repo.updateCase(context.db, input.caseId, {
    status: "submitted",
    completedAt: new Date(),
  });

  await emitCaseEvent(context, {
    caseId: input.caseId,
    companyId: result.companyId,
    action: "case.submitted",
    summary: `Case submitted to ${template.agencyId}`,
    data: { submissionId: result.submissionId, agencyId: template.agencyId },
  });

  return {
    submissionId: result.submissionId,
    companyId: result.companyId,
    submission: result.submission,
  };
}

export async function cancelCase(context: Context, input: { caseId: string }) {
  const caseRecord = await assertCaseIdAccess(context, input.caseId);

  await repo.updateCase(context.db, input.caseId, { status: "cancelled" });

  await emitCaseEvent(context, {
    caseId: input.caseId,
    companyId: caseRecord.companyId,
    action: "case.cancelled",
    summary: "Case cancelled",
  });

  return getCaseDetail(context, input.caseId);
}

export async function getCaseActivity(context: Context, input: { caseId: string; limit?: number }) {
  await assertCaseIdAccess(context, input.caseId);
  return listCaseActivity(context, input);
}

export { CASE_STATUSES };
