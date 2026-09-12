import { ORPCError } from "@orpc/server";

import type { CheckRun, Finding, FindingNote } from "@nationa/db";

import { evaluateRules } from "../../checks/rule-set";
import { resolveDeadlineDate } from "../../checks/rules/obligation-deadlines";
import { RULE_SET_VERSION } from "../../checks/types";
import type {
  BeneficialOwner,
  CheckDocument,
  CheckSubject,
  CheckSubjectType,
  ExtractedValue,
  ExtractedValues,
  FindingNoteKindValue,
  FindingSeverity,
  FindingStatus,
  ObligationContext,
  RequiredDocumentType,
  RuleContext,
} from "../../checks/types";
import { normalizeFieldKey } from "../../domain/fields";
import type { Context } from "../context";
import {
  findCaseById,
  findCompanyById,
  findFindingNotes,
  findFindings,
  findFindingsByRun,
  findLatestRegistrySnapshot,
  findLatestRunForSubject,
  findOpenBlockingFindings,
  findPersonById,
  findRunById,
  findSubjectCompanyId,
  insertFindingNote,
  insertRunWithFindings,
  listActiveObligations,
  listCheckDocuments,
  listCompanyPersons,
  listExtractedFieldRows,
  listFilingsByCompany,
  listRequiredDocumentTypes,
  listRunsForSubject,
  resolveSubject,
  updateFindingStatus,
  type ResolvedSubject,
} from "../repositories/checks.repo";

const COMPLETED_FILING_STATUSES = new Set(["submitted", "approved"]);
const OPEN_BLOCKING_STATUSES: FindingStatus[] = ["open", "acknowledged"];

export type RunChecksResult = {
  run: CheckRun;
  findings: Finding[];
};

export type ListFindingsFilter = {
  subject?: CheckSubject;
  checkRunId?: string;
  findingId?: string;
  status?: FindingStatus;
  severity?: FindingSeverity;
  limit?: number;
};

export type SubmissionReadiness = {
  ready: boolean;
  hasRun: boolean;
  blockingCount: number;
  blockers: Finding[];
};

function fieldCanonicalKey(normalizedKey: string | null, key: string): string | null {
  const candidate = normalizedKey ?? key;
  if (!candidate) {
    return null;
  }
  return normalizeFieldKey(candidate) ?? normalizedKey;
}

function scalarToString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function fieldToValue(valueText: string | null, valueJsonb: unknown): string | null {
  if (valueText !== null && valueText !== undefined && valueText.length > 0) {
    return valueText;
  }
  return scalarToString(valueJsonb);
}

async function loadExtractedValues(
  ctx: Context,
  subject: ResolvedSubject,
  versionIds: string[],
): Promise<ExtractedValues> {
  const extracted: ExtractedValues = {};

  const fieldRows = await listExtractedFieldRows(ctx.db, versionIds);
  for (const row of fieldRows) {
    const canonical = fieldCanonicalKey(row.field.normalizedKey ?? null, row.field.key);
    if (!canonical || extracted[canonical]) {
      continue;
    }
    const value = fieldToValue(row.field.valueText ?? null, row.field.valueJsonb);
    if (value === null) {
      continue;
    }
    const entry: ExtractedValue = {
      value,
      fieldKey: canonical,
      labelKey: `checks.fields.${canonical}`,
      source: "extracted_fields",
      ref: row.field.id,
      documentVersionId: row.documentVersionId ?? null,
    };
    extracted[canonical] = entry;
  }

  if (subject.companyId) {
    const snapshotRow = await findLatestRegistrySnapshot(ctx.db, subject.companyId);
    const snapshot = snapshotRow?.snapshot;
    if (snapshot && typeof snapshot === "object") {
      for (const [rawKey, rawValue] of Object.entries(snapshot)) {
        const canonical = normalizeFieldKey(rawKey);
        if (!canonical || extracted[canonical]) {
          continue;
        }
        const value = scalarToString(rawValue);
        if (value === null) {
          continue;
        }
        extracted[canonical] = {
          value,
          fieldKey: canonical,
          labelKey: `checks.fields.${canonical}`,
          source: "company_registry_snapshots",
          ref: snapshotRow?.id ?? null,
          documentVersionId: snapshotRow?.documentVersionId ?? null,
        };
      }
    }
  }

  return extracted;
}

export async function loadCheckContext(
  ctx: Context,
  subject: CheckSubject,
  now: Date = new Date(),
): Promise<RuleContext> {
  const resolved = await resolveSubject(ctx.db, subject);

  const company = resolved.companyId ? await findCompanyById(ctx.db, resolved.companyId) : null;
  const caseRecord = resolved.caseId ? await findCaseById(ctx.db, resolved.caseId) : null;
  const person = caseRecord?.applicantPersonId
    ? await findPersonById(ctx.db, caseRecord.applicantPersonId)
    : null;

  const documentRows = await listCheckDocuments(ctx.db, resolved);

  const checkDocuments: CheckDocument[] = documentRows.map((row) => ({
    document: row.document,
    documentType: row.documentType ?? null,
    latestVersion: row.version ?? null,
  }));

  const versionIds = checkDocuments
    .map((entry) => entry.latestVersion?.id)
    .filter((value): value is string => Boolean(value));

  const extracted = await loadExtractedValues(ctx, resolved, versionIds);

  let requiredDocumentTypes: RequiredDocumentType[] = [];
  if (caseRecord?.templateId) {
    const stepRows = await listRequiredDocumentTypes(ctx.db, caseRecord.templateId);

    requiredDocumentTypes = stepRows.map((row) => ({
      documentTypeId: row.type.id,
      code: row.type.code,
      nameFr: row.type.nameFr,
      nameAr: row.type.nameAr ?? null,
      isOptional: row.step.isOptional,
      stepId: row.step.id,
      stepCode: row.step.code,
    }));
  }

  const obligationRows = await listActiveObligations(ctx.db);

  const filingRows = resolved.companyId
    ? await listFilingsByCompany(ctx.db, resolved.companyId)
    : [];

  const completedObligationIds = new Set(
    filingRows
      .filter((filing) => COMPLETED_FILING_STATUSES.has(filing.status))
      .map((filing) => filing.obligationId)
      .filter((value): value is string => Boolean(value)),
  );

  const obligationContexts: ObligationContext[] = obligationRows.map((obligation) => ({
    obligation,
    dueDate: resolveDeadlineDate(obligation.deadlineRule, now),
    hasCompletedFiling: completedObligationIds.has(obligation.id),
  }));

  let beneficialOwners: BeneficialOwner[] = [];
  if (resolved.companyId) {
    const ownerRows = await listCompanyPersons(ctx.db, resolved.companyId);
    beneficialOwners = ownerRows.map((row) => ({
      personId: row.personId,
      role: row.role,
      ownershipPercent: row.ownershipPercent ?? null,
    }));
  }

  return {
    subject,
    now,
    company,
    person,
    case: caseRecord,
    documents: checkDocuments,
    extracted,
    requiredDocumentTypes,
    obligations: obligationContexts,
    beneficialOwners,
  };
}

export async function runChecks(
  ctx: Context,
  subject: CheckSubject,
  now: Date = new Date(),
): Promise<RunChecksResult> {
  const ruleContext = await loadCheckContext(ctx, subject, now);
  const drafts = evaluateRules(ruleContext);

  return insertRunWithFindings(ctx.db, {
    subject,
    ruleSetVersion: RULE_SET_VERSION,
    now,
    drafts,
  });
}

async function latestRunForSubject(ctx: Context, subject: CheckSubject): Promise<CheckRun | null> {
  return findLatestRunForSubject(ctx.db, subject);
}

export async function listCheckRuns(
  ctx: Context,
  subject: CheckSubject,
  limit = 20,
): Promise<CheckRun[]> {
  return listRunsForSubject(ctx.db, subject, limit);
}

export async function getCheckRun(
  ctx: Context,
  runId: string,
): Promise<{ run: CheckRun; findings: Finding[] } | null> {
  const run = await findRunById(ctx.db, runId);
  if (!run) {
    return null;
  }
  const rows = await findFindingsByRun(ctx.db, run.id);
  return { run, findings: rows };
}

export async function listFindings(ctx: Context, filter: ListFindingsFilter): Promise<Finding[]> {
  let subjectRunId: string | undefined;
  if (filter.subject) {
    const run = await latestRunForSubject(ctx, filter.subject);
    if (!run) {
      return [];
    }
    subjectRunId = run.id;
  }

  return findFindings(ctx.db, {
    findingId: filter.findingId,
    checkRunId: filter.checkRunId,
    subjectRunId,
    status: filter.status,
    severity: filter.severity,
    limit: filter.limit,
  });
}

export async function setFindingStatus(
  ctx: Context,
  input: { findingId: string; status: FindingStatus; userId?: string | null; note?: string },
): Promise<Finding> {
  const updated = await updateFindingStatus(ctx.db, {
    findingId: input.findingId,
    status: input.status,
    userId: input.userId,
  });

  if (!updated) {
    throw new Error(`Finding ${input.findingId} not found`);
  }

  const note = input.note?.trim();
  if (note) {
    await insertFindingNote(ctx.db, {
      findingId: input.findingId,
      userId: input.userId ?? null,
      kind: "explanation",
      body: note,
    });
  }

  return updated;
}

export async function addFindingNote(
  ctx: Context,
  input: {
    findingId: string;
    userId?: string | null;
    body: string;
    kind?: FindingNoteKindValue;
  },
): Promise<FindingNote> {
  const note = await insertFindingNote(ctx.db, {
    findingId: input.findingId,
    userId: input.userId ?? null,
    kind: input.kind ?? "note",
    body: input.body.trim(),
  });

  if (!note) {
    throw new Error("Failed to add finding note");
  }
  return note;
}

export async function listFindingNotes(ctx: Context, findingId: string): Promise<FindingNote[]> {
  return findFindingNotes(ctx.db, findingId);
}

export async function findBlockingFindings(
  ctx: Context,
  subject: CheckSubject,
): Promise<Finding[]> {
  const run = await latestRunForSubject(ctx, subject);
  if (!run) {
    return [];
  }
  return findOpenBlockingFindings(ctx.db, run.id, OPEN_BLOCKING_STATUSES);
}

export async function getSubmissionReadiness(
  ctx: Context,
  subject: CheckSubject,
): Promise<SubmissionReadiness> {
  const run = await latestRunForSubject(ctx, subject);
  if (!run) {
    return { ready: true, hasRun: false, blockingCount: 0, blockers: [] };
  }
  const blockers = await findBlockingFindings(ctx, subject);
  return {
    ready: blockers.length === 0,
    hasRun: true,
    blockingCount: blockers.length,
    blockers,
  };
}

export async function assertSubjectInCompany(
  ctx: Context,
  companyId: string,
  subjectType: CheckSubjectType,
  subjectId: string,
): Promise<void> {
  const resolved = await findSubjectCompanyId(ctx.db, subjectType, subjectId);
  if (resolved !== companyId) {
    throw new ORPCError("FORBIDDEN", {
      message: "Subject does not belong to this company",
      data: { companyId, subjectType, subjectId },
    });
  }
}

export async function requireRun(
  ctx: Context,
  runId: string,
): Promise<{ run: CheckRun; findings: Finding[] }> {
  const result = await getCheckRun(ctx, runId);
  if (!result) {
    throw new ORPCError("NOT_FOUND", { message: "Check run not found" });
  }
  return result;
}

export async function requireFinding(ctx: Context, findingId: string): Promise<Finding> {
  const rows = await listFindings(ctx, { findingId, limit: 1 });
  const finding = rows[0];
  if (!finding) {
    throw new ORPCError("NOT_FOUND", { message: "Finding not found" });
  }
  return finding;
}

export async function assertFindingInCompany(
  ctx: Context,
  companyId: string,
  finding: Finding,
): Promise<void> {
  const { run } = await requireRun(ctx, finding.checkRunId);
  await assertSubjectInCompany(ctx, companyId, run.subjectType, run.subjectId);
}
