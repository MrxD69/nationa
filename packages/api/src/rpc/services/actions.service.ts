import { ORPCError } from "@orpc/server";

import type {
  Case,
  CaseFieldValue,
  Document,
  DocumentType,
  DocumentVersion,
  Fee,
  Finding,
  JsonObject,
  RuleCitation,
} from "@nationa/db";

import { assertCompanyPermission, requireUser } from "../../auth/access";
import { assertCasePermission } from "../../auth/case-access";
import { RECOMMENDED_DEMARCHE_KIND } from "../../ai/recommend";
import {
  deriveActionProgress,
  deriveActionStatus,
  deriveStepState,
  isTerminalStepState,
  mapFindingsToSteps,
  type ActionFinding,
  type ActionStepState,
  type StepSignals,
} from "../../domain/action-state";
import type { ParsedFormSchema } from "../../domain/procedure-forms";
import { parseFormSchema } from "../../domain/procedure-forms";
import { stepGuidance } from "../../domain/step-guidance";
import type { Context } from "../context";
import * as repo from "../repositories/actions.repo";
import { listDraftProposalsBySubject } from "../repositories/ai.repo";
import { startCase } from "./cases.service";
import { runChecks, type RunChecksResult } from "./checks.service";

export type { ActionStepState } from "../../domain/action-state";

export type ActionCatalogItem = {
  id: string;
  agencyId: string;
  agencyNameFr: string | null;
  agencyNameAr: string | null;
  code: string;
  nameFr: string;
  nameAr: string | null;
  description: string | null;
  category: string | null;
  estimatedDays: number | null;
  stepCount: number;
  requiredDocumentCount: number;
  status: ActionStepState;
  progress: number;
  caseId: string | null;
  recommended?: boolean;
  recommendationReason?: string | null;
};

export type ActionStep = {
  id: string;
  caseStepId: string | null;
  templateStepId: string | null;
  position: number;
  code: string;
  titleFr: string;
  titleAr: string | null;
  description: string | null;
  stepType: string;
  isOptional: boolean;
  state: ActionStepState;
  reachable: boolean;
  signals: StepSignals;
  requiredDocumentType: DocumentType | null;
  formSchema: ParsedFormSchema;
  citations: RuleCitation[];
  fields: CaseFieldValue[];
  documents: Array<{ document: Document; version: DocumentVersion | null }>;
  findings: Finding[];
};

export type ActionFeeSummary = {
  currency: string;
  total: number;
  items: Array<{ feeId: string; label: string; amount: number; currency: string }>;
};

export type ActionVerification = {
  hasRun: boolean;
  runId: string | null;
  runStatus: string | null;
  ranAt: Date | null;
  findingsCount: number;
  openErrors: number;
  openBlockers: number;
};

export type ActionTracker = {
  action: {
    id: string;
    agencyId: string;
    agencyNameFr: string | null;
    agencyNameAr: string | null;
    code: string;
    nameFr: string;
    nameAr: string | null;
    description: string | null;
    category: string | null;
    estimatedDays: number | null;
    stepCount: number;
  };
  case: Case | null;
  feeSummary: ActionFeeSummary | null;
  aggregate: {
    state: ActionStepState;
    progress: number;
    totalSteps: number;
    completedSteps: number;
    nextStepId: string | null;
  };
  verification: ActionVerification;
  steps: ActionStep[];
};

export type StartActionResult = {
  resumed: boolean;
  caseId: string;
  tracker: ActionTracker;
};

const GENERATED_SOURCES = new Set(["generated", "ai_generated"]);
const OPEN_FINDING_STATUSES = new Set(["open", "acknowledged"]);

function scalarToString(value: unknown): string | null {
  if (typeof value === "string") {
    return value.length > 0 ? value : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function primaryText(field: CaseFieldValue | undefined): string | null {
  if (!field) {
    return null;
  }
  if (typeof field.valueText === "string" && field.valueText.length > 0) {
    return field.valueText;
  }
  return scalarToString(field.valueJsonb);
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      return toRecord(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toStringArray(value: unknown): string[] {
  const raw =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return null;
          }
        })()
      : value;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((entry): entry is string => typeof entry === "string");
}

function toNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveFeeAmount(
  fee: { amount: string; logic: JsonObject | null },
  capital: number | null,
): number {
  const logic = fee.logic ?? {};
  if (logic.type === "percentage_of_capital" && capital !== null) {
    const rate = typeof logic.rate === "number" ? logic.rate : 0;
    const min = typeof logic.min === "number" ? logic.min : 0;
    const max = typeof logic.max === "number" ? logic.max : Number.POSITIVE_INFINITY;
    return Math.min(Math.max(capital * rate, min), max);
  }
  const parsed = Number(fee.amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildFeeSummary(feeRows: Fee[], capital: number | null): ActionFeeSummary | null {
  if (feeRows.length === 0) {
    return null;
  }
  const items = feeRows.map((fee) => ({
    feeId: fee.id,
    label: fee.label,
    amount: resolveFeeAmount({ amount: fee.amount, logic: fee.logic }, capital),
    currency: fee.currency,
  }));
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return { currency: items[0]?.currency ?? "TND", total, items };
}

function loadCaseOrThrow(context: Context, caseId: string): Promise<Case> {
  return repo.findCaseById(context.db, caseId).then((caseRecord) => {
    if (!caseRecord) {
      throw new ORPCError("NOT_FOUND", { message: "Case not found" });
    }
    return caseRecord;
  });
}

function findingSeverityCounts(findings: Finding[]): ActionVerification {
  let openErrors = 0;
  let openBlockers = 0;
  for (const finding of findings) {
    if (!OPEN_FINDING_STATUSES.has(finding.status)) {
      continue;
    }
    if (finding.severity === "error") {
      openErrors += 1;
    }
    if (finding.severity === "blocker") {
      openBlockers += 1;
    }
  }
  return {
    hasRun: false,
    runId: null,
    runStatus: null,
    ranAt: null,
    findingsCount: findings.length,
    openErrors,
    openBlockers,
  };
}

function deriveCatalogStatus(
  caseRecord: Case | null,
  caseSteps: CaseStepLike[],
  factIds: string[],
): { status: ActionStepState; progress: number; caseId: string | null } {
  if (!caseRecord) {
    return { status: "not_started", progress: 0, caseId: null };
  }

  const stepsByTemplateId = new Map<string, CaseStepLike>();
  for (const step of caseSteps) {
    if (step.templateStepId) {
      stepsByTemplateId.set(step.templateStepId, step);
    }
  }

  const states: ActionStepState[] = factIds.map((templateStepId, index) => {
    const caseStep = stepsByTemplateId.get(templateStepId);
    const stepStatus = caseStep?.status ?? (index === 0 ? "available" : "locked");
    return deriveStepState({
      stepStatus,
      caseStatus: caseRecord.status,
    }).state;
  });

  return {
    status: deriveActionStatus(states),
    progress: Math.round(deriveActionProgress(states) * 100),
    caseId: caseRecord.id,
  };
}

type CaseStepLike = {
  templateStepId: string | null;
  status: "locked" | "available" | "in_progress" | "completed" | "skipped";
};

export async function listActionCatalog(
  context: Context,
  input: { agencyId?: string; companyId?: string } = {},
): Promise<ActionCatalogItem[]> {
  if (input.companyId) {
    await assertCompanyPermission(context, input.companyId, "cases.read");
  }

  const recommendedCodes = new Set<string>();
  const recommendationReasons: Record<string, unknown> = {};
  let recommendationRationale: string | null = null;
  if (input.companyId) {
    const [proposal] = await listDraftProposalsBySubject(context.db, {
      subjectType: "company",
      subjectId: input.companyId,
      kind: RECOMMENDED_DEMARCHE_KIND,
    });
    if (proposal) {
      const payload = toRecord(proposal.payload) ?? {};
      for (const code of toStringArray(payload.codes)) {
        recommendedCodes.add(code);
      }
      const reasons = toRecord(payload.reasons);
      if (reasons) {
        Object.assign(recommendationReasons, reasons);
      }
      recommendationRationale = proposal.rationale ?? null;
    }
  }

  const templates = await repo.listCatalogTemplates(context.db, input.agencyId);
  if (templates.length === 0) {
    return [];
  }

  const templateIds = templates.map((template) => template.id);
  const facts = await repo.listTemplateStepFacts(context.db, templateIds);

  const factsByTemplate = new Map<string, typeof facts>();
  for (const fact of facts) {
    const list = factsByTemplate.get(fact.templateId) ?? [];
    list.push(fact);
    factsByTemplate.set(fact.templateId, list);
  }

  const latestCaseByTemplate = new Map<string, Case>();
  const stepsByCase = new Map<string, CaseStepLike[]>();

  if (input.companyId) {
    const caseRows = await repo.listCompanyCasesForTemplates(
      context.db,
      input.companyId,
      templateIds,
    );
    for (const row of caseRows) {
      if (!latestCaseByTemplate.has(row.templateId)) {
        latestCaseByTemplate.set(row.templateId, row);
      }
    }

    const caseIds = [...latestCaseByTemplate.values()].map((row) => row.id);
    const caseStepRows = await repo.listCaseStepsForCases(context.db, caseIds);
    for (const step of caseStepRows) {
      const list = stepsByCase.get(step.caseId) ?? [];
      list.push(step);
      stepsByCase.set(step.caseId, list);
    }
  }

  const items: ActionCatalogItem[] = [];
  for (const template of templates) {
    const templateFacts = factsByTemplate.get(template.id) ?? [];
    // Templates made only of hidden review steps are not catalog entries.
    if (templateFacts.length === 0) continue;
    const documentTypeIds = new Set(
      templateFacts
        .map((fact) => fact.requiredDocumentTypeId)
        .filter((value): value is string => Boolean(value)),
    );
    const caseRecord = latestCaseByTemplate.get(template.id) ?? null;
    const caseSteps = caseRecord ? (stepsByCase.get(caseRecord.id) ?? []) : [];
    const derived = deriveCatalogStatus(
      caseRecord,
      caseSteps,
      templateFacts.map((fact) => fact.id),
    );

    items.push({
      id: template.id,
      agencyId: template.agencyId,
      agencyNameFr: template.agencyNameFr,
      agencyNameAr: template.agencyNameAr,
      code: template.code,
      nameFr: template.nameFr,
      nameAr: template.nameAr,
      description: template.description,
      category: template.category,
      estimatedDays: template.estimatedDays,
      stepCount: templateFacts.length,
      requiredDocumentCount: documentTypeIds.size,
      status: derived.status,
      progress: derived.progress,
      caseId: derived.caseId,
      recommended: recommendedCodes.has(template.code),
      recommendationReason: recommendedCodes.has(template.code)
        ? typeof recommendationReasons[template.code] === "string"
          ? (recommendationReasons[template.code] as string)
          : recommendationRationale
        : null,
    });
  }

  return items;
}

export async function getActionTracker(
  context: Context,
  input: { companyId?: string; templateId?: string; code?: string; caseId?: string },
): Promise<ActionTracker> {
  let caseRecord: Case | null = null;
  if (input.caseId) {
    caseRecord = await loadCaseOrThrow(context, input.caseId);
    await assertCasePermission(context, caseRecord, "cases.read");
    if (input.companyId && caseRecord.companyId && caseRecord.companyId !== input.companyId) {
      throw new ORPCError("NOT_FOUND", { message: "Case not found for this company" });
    }
  }

  const template = await repo.findTemplateDetailed(context.db, {
    templateId: caseRecord?.templateId ?? input.templateId,
    code: input.code,
  });
  if (!template) {
    throw new ORPCError("NOT_FOUND", { message: "Procedure template not found" });
  }

  if (input.companyId && !caseRecord?.companyId) {
    await assertCompanyPermission(context, input.companyId, "cases.read");
  }

  const stepRows = await repo.listTemplateStepsDetailed(context.db, template.id);
  const stepIds = stepRows.map((row) => row.step.id);

  const [
    citationRows,
    caseStepRows,
    fieldRows,
    documentRows,
    versionRows,
    submissionRows,
    feeRows,
  ] = await Promise.all([
    repo.listStepCitations(context.db, stepIds),
    caseRecord ? repo.listCaseSteps(context.db, caseRecord.id) : Promise.resolve([]),
    caseRecord ? repo.listCaseFields(context.db, caseRecord.id) : Promise.resolve([]),
    caseRecord ? repo.listCaseDocumentsWithVersion(context.db, caseRecord.id) : Promise.resolve([]),
    caseRecord ? repo.listCaseDocumentVersions(context.db, caseRecord.id) : Promise.resolve([]),
    caseRecord ? repo.listCaseSubmissions(context.db, caseRecord.id) : Promise.resolve([]),
    repo.listActiveTemplateFees(context.db, template.id),
  ]);

  const run = caseRecord ? await repo.findLatestCaseRun(context.db, caseRecord.id) : null;
  const findingRows = run ? await repo.listFindingsByRun(context.db, run.id) : [];

  const citationsByStep = new Map<string, RuleCitation[]>();
  for (const row of citationRows) {
    const list = citationsByStep.get(row.stepId) ?? [];
    list.push(row.citation);
    citationsByStep.set(row.stepId, list);
  }

  const caseStepByTemplateId = new Map<string, (typeof caseStepRows)[number]>();
  for (const step of caseStepRows) {
    if (step.templateStepId) {
      caseStepByTemplateId.set(step.templateStepId, step);
    }
  }

  const documentVersionTypes: Record<string, string> = {};
  for (const version of versionRows) {
    if (version.documentTypeId) {
      documentVersionTypes[version.id] = version.documentTypeId;
    }
  }

  const findingTargets = stepRows.map(({ step, documentType }) => ({
    id: step.id,
    requiredDocumentTypeId: step.requiredDocumentTypeId,
    requiredDocumentTypeCode: documentType?.code ?? null,
    formFieldKeys: parseFormSchema(step.formSchema).fields.map((field) => field.key),
  }));

  const { byStep, actionLevel } = mapFindingsToSteps({
    findings: findingRows,
    steps: findingTargets,
    documentVersionTypes,
  });
  const actionFindings: ActionFinding[] = actionLevel;

  const submissionStatuses = submissionRows.map((row) => row.status);
  const capital = toNumber(primaryText(fieldRows.find((row) => row.fieldKey === "capitalAmount")));

  const verificationBase = findingSeverityCounts(findingRows);
  const verification: ActionVerification = {
    ...verificationBase,
    hasRun: Boolean(run),
    runId: run?.id ?? null,
    runStatus: run?.status ?? null,
    ranAt: run?.completedAt ?? run?.createdAt ?? null,
  };

  // Review steps are excluded at the repo layer, so displayed positions are renumbered 1..N.
  const steps: ActionStep[] = stepRows.map((row, index) => {
    const { step, documentType } = row;
    const caseStep = caseStepByTemplateId.get(step.id) ?? null;
    const formSchema = parseFormSchema(step.formSchema);
    const formFieldKeys = new Set<string>(formSchema.fields.map((field) => field.key));

    const stepFields = fieldRows.filter(
      (field) =>
        (caseStep ? field.stepId === caseStep.id : false) || formFieldKeys.has(field.fieldKey),
    );

    const stepDocuments = documentRows.filter(
      (entry) =>
        Boolean(step.requiredDocumentTypeId) &&
        entry.document.documentTypeId === step.requiredDocumentTypeId,
    );

    const generatedDocument = stepDocuments.some(
      (entry) => entry.version && GENERATED_SOURCES.has(entry.version.source),
    );

    const stepStatus = caseStep?.status ?? (index === 0 ? "available" : "locked");
    const derived = deriveStepState({
      stepStatus,
      findings: byStep.get(step.id) ?? [],
      actionFindings,
      caseStatus: caseRecord?.status ?? null,
      submissionStatuses,
      hasCheckRun: Boolean(run),
      hasFields: stepFields.length > 0,
      hasDocuments: stepDocuments.length > 0,
      generatedDocument,
    });

    return {
      id: caseStep?.id ?? step.id,
      caseStepId: caseStep?.id ?? null,
      templateStepId: step.id,
      position: index + 1,
      code: step.code,
      titleFr: step.titleFr,
      titleAr: step.titleAr,
      description: stepGuidance(template.code, step.code, step.description),
      stepType: step.stepType,
      isOptional: step.isOptional,
      state: derived.state,
      reachable: derived.reachable,
      signals: derived.signals,
      requiredDocumentType: documentType ?? null,
      formSchema,
      citations: citationsByStep.get(step.id) ?? [],
      fields: stepFields,
      documents: stepDocuments,
      findings: byStep.get(step.id) ?? [],
    };
  });

  const states = steps.map((step) => step.state);
  const nextStep = steps.find((step) => step.reachable && !isTerminalStepState(step.state)) ?? null;

  return {
    action: {
      id: template.id,
      agencyId: template.agencyId,
      agencyNameFr: template.agencyNameFr,
      agencyNameAr: template.agencyNameAr,
      code: template.code,
      nameFr: template.nameFr,
      nameAr: template.nameAr,
      description: template.description,
      category: template.category,
      estimatedDays: template.estimatedDays,
      stepCount: steps.length,
    },
    case: caseRecord,
    feeSummary: buildFeeSummary(feeRows, capital),
    aggregate: {
      state: deriveActionStatus(states),
      progress: Math.round(deriveActionProgress(states) * 100),
      totalSteps: steps.length,
      completedSteps: states.filter((state) => isTerminalStepState(state)).length,
      nextStepId: nextStep?.id ?? null,
    },
    verification,
    steps,
  };
}

const OUTSTANDING_STATES: ReadonlySet<ActionStepState> = new Set<ActionStepState>([
  "in_progress",
  "needs_correction",
  "blocked",
]);

export async function listOutstandingActions(
  context: Context,
  input: { companyId?: string; limit?: number } = {},
): Promise<ActionCatalogItem[]> {
  const catalog = await listActionCatalog(context, { companyId: input.companyId });
  const limit = input.limit ?? 10;
  return catalog.filter((item) => OUTSTANDING_STATES.has(item.status)).slice(0, limit);
}

export async function searchActions(
  context: Context,
  input: { query: string; companyId?: string; limit?: number },
): Promise<ActionCatalogItem[]> {
  const catalog = await listActionCatalog(context, { companyId: input.companyId });
  const query = input.query.trim().toLowerCase();
  const limit = input.limit ?? 20;
  if (!query) {
    return catalog.slice(0, limit);
  }

  return catalog
    .filter((item) => {
      const haystack = [
        item.nameFr,
        item.nameAr,
        item.description,
        item.code,
        item.category,
        item.agencyNameFr,
        item.agencyNameAr,
      ];
      return haystack.some(
        (value) => typeof value === "string" && value.toLowerCase().includes(query),
      );
    })
    .slice(0, limit);
}

export async function startAction(
  context: Context,
  input: { templateId: string; companyId?: string; title?: string },
): Promise<StartActionResult> {
  const user = requireUser(context);
  if (input.companyId) {
    await assertCompanyPermission(context, input.companyId, "cases.write");
  }

  const existing = await repo.findOpenCaseForTemplate(context.db, {
    templateId: input.templateId,
    userId: user.id,
    companyId: input.companyId,
  });

  if (existing) {
    return {
      resumed: true,
      caseId: existing.id,
      tracker: await getActionTracker(context, {
        caseId: existing.id,
        companyId: input.companyId,
      }),
    };
  }

  const created = await startCase(context, {
    templateId: input.templateId,
    companyId: input.companyId,
    title: input.title,
  });

  return {
    resumed: false,
    caseId: created.case.id,
    tracker: await getActionTracker(context, {
      caseId: created.case.id,
      companyId: input.companyId,
    }),
  };
}

export async function runActionChecks(
  context: Context,
  input: { caseId: string },
): Promise<RunChecksResult> {
  const caseRecord = await loadCaseOrThrow(context, input.caseId);
  await assertCasePermission(context, caseRecord, "checks.run");
  return runChecks(context, { type: "case", id: input.caseId });
}
