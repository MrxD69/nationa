import { ORPCError } from "@orpc/server";

import type { Finding, Submission } from "@nationa/db";

import { isMinistryAgent, requireUser } from "../../auth/access";
import {
  computeCleanliness,
  type CleanlinessBreakdown,
  type CleanlinessTier,
} from "../../domain/cleanliness";
import type { Context } from "../context";
import { insertActivityEvent } from "../repositories/activity.repo";
import { insertNotification } from "../repositories/notifications.repo";
import * as repo from "../repositories/submissions.repo";
import { getSubmissionReadiness, listFindings, type SubmissionReadiness } from "./checks.service";

export { SUBMISSION_ATTENTION_STATUSES } from "../repositories/submissions.repo";

const REUSABLE_STATUSES = ["draft", "queued"] as const;

export type SubmissionStatus =
  | "draft"
  | "queued"
  | "in_review"
  | "approved"
  | "rejected"
  | "returned"
  | "escalated";

type CleanlinessSnapshot = CleanlinessBreakdown | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readCleanlinessSnapshot(submission: Submission): CleanlinessSnapshot {
  const snapshot = submission.snapshot;
  if (!isRecord(snapshot)) {
    return null;
  }
  const cleanliness = snapshot.cleanliness;
  if (!isRecord(cleanliness)) {
    return null;
  }
  return cleanliness as unknown as CleanlinessBreakdown;
}

function encodeCursor(offset: number): string {
  return String(offset);
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

async function emitSubmissionEvent(
  context: Context,
  input: {
    submissionId: string;
    companyId: string | null;
    action: string;
    summary: string;
    actorType?: "user" | "system" | "officer";
    actorUserId?: string | null;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  await insertActivityEvent(context.db, {
    companyId: input.companyId,
    actorUserId: input.actorUserId ?? context.user?.id ?? null,
    actorType: input.actorType ?? "user",
    entityType: "submission",
    entityId: input.submissionId,
    action: input.action,
    summary: input.summary,
    data: input.data ?? null,
  });
}

async function loadCaseOrThrow(context: Context, caseId: string) {
  const caseRecord = await repo.findCaseById(context.db, caseId);
  if (!caseRecord) {
    throw new ORPCError("NOT_FOUND", { message: "Case not found" });
  }
  return caseRecord;
}

async function loadTemplateOrThrow(context: Context, templateId: string) {
  const template = await repo.findTemplateById(context.db, templateId);
  if (!template) {
    throw new ORPCError("NOT_FOUND", { message: "Procedure template not found" });
  }
  return template;
}

async function countMissingRequiredDocuments(
  context: Context,
  caseId: string,
  templateId: string,
): Promise<number> {
  const requiredTypeIds = [
    ...new Set(await repo.listRequiredStepDocumentTypeIds(context.db, templateId)),
  ];
  if (requiredTypeIds.length === 0) {
    return 0;
  }

  const presentRows = await repo.listPresentDocumentTypeIds(context.db, caseId, requiredTypeIds);
  const present = new Set(presentRows);
  return requiredTypeIds.filter((id) => !present.has(id)).length;
}

async function loadCaseSnapshot(context: Context, caseId: string) {
  const [fieldRows, documentRows] = await Promise.all([
    repo.listCaseFieldValues(context.db, caseId),
    repo.listCaseDocuments(context.db, caseId),
  ]);

  const fields = fieldRows.map((field) => ({
    fieldKey: field.fieldKey,
    valueText: field.valueText,
    valueJsonb: field.valueJsonb,
    sourceKind: field.sourceKind,
    confidence: field.confidence,
  }));
  const docSnapshot = documentRows.map((document) => ({
    id: document.id,
    title: document.title,
    status: document.status,
    documentTypeId: document.documentTypeId,
    currentVersionId: document.currentVersionId,
  }));

  return { fields, docSnapshot, documentRows };
}

async function linkSubmissionDocuments(
  context: Context,
  submissionId: string,
  documentRows: Array<{ currentVersionId: string | null }>,
  addedBy: string | null,
): Promise<void> {
  const versionIds = documentRows
    .map((row) => row.currentVersionId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  if (versionIds.length === 0) {
    return;
  }
  await repo.insertSubmissionDocuments(
    context.db,
    versionIds.map((versionId) => ({
      submissionId,
      documentVersionId: versionId,
      addedBy,
    })),
  );
}

async function loadFindingsForCase(context: Context, caseId: string): Promise<Finding[]> {
  return listFindings(context, { subject: { type: "case", id: caseId } });
}

export type CreateSubmissionFromCaseInput = {
  caseId: string;
  companyId?: string;
  submittedByUserId?: string | null;
  acknowledgeBlockers?: boolean;
};

export type CreateSubmissionFromCaseResult = {
  submission: Submission;
  submissionId: string;
  companyId: string;
  readiness: SubmissionReadiness;
  cleanliness: CleanlinessBreakdown;
  created: boolean;
};

/**
 * Creates (or reuses) the submission attached to a case. This is the single
 * place where cleanliness is computed for a submission, so both the owner
 * `createFromCase` route and the legacy `cases.submit` route stay consistent.
 */
export async function createSubmissionFromCase(
  context: Context,
  input: CreateSubmissionFromCaseInput,
): Promise<CreateSubmissionFromCaseResult> {
  const caseRecord = await loadCaseOrThrow(context, input.caseId);
  if (input.companyId && caseRecord.companyId !== input.companyId) {
    throw new ORPCError("FORBIDDEN", {
      message: "Case does not belong to this company",
      data: { companyId: input.companyId, caseId: input.caseId },
    });
  }
  const companyId = caseRecord.companyId;
  if (!companyId) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Cannot submit a case without a company",
    });
  }

  const template = await loadTemplateOrThrow(context, caseRecord.templateId);

  const readiness = await getSubmissionReadiness(context, {
    type: "case",
    id: caseRecord.id,
  });
  if (!readiness.ready && !input.acknowledgeBlockers) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Blocking findings must be acknowledged before submitting",
      data: {
        blockingCount: readiness.blockingCount,
        blockers: readiness.blockers,
      },
    });
  }

  const [missingDocumentCount, findingRows, snapshotParts] = await Promise.all([
    countMissingRequiredDocuments(context, caseRecord.id, template.id),
    loadFindingsForCase(context, caseRecord.id),
    loadCaseSnapshot(context, caseRecord.id),
  ]);

  const cleanliness = computeCleanliness({ findings: findingRows, missingDocumentCount });
  const snapshot = {
    generatedAt: new Date().toISOString(),
    fields: snapshotParts.fields,
    documents: snapshotParts.docSnapshot,
    cleanliness,
  };

  const existing = await repo.findReusableSubmission(context.db, caseRecord.id, REUSABLE_STATUSES);

  const now = new Date();
  const submittedByUserId = input.submittedByUserId ?? context.user?.id ?? null;

  let submission: Submission | undefined;
  let created = false;

  if (existing) {
    submission =
      (await repo.updateSubmission(context.db, existing.id, {
        companyId,
        agencyId: template.agencyId,
        submittedByUserId: submittedByUserId ?? existing.submittedByUserId,
        status: "queued",
        snapshot,
        cleanlinessTier: cleanliness.tier,
        cleanlinessScore: cleanliness.score,
        submittedAt: existing.submittedAt ?? now,
      })) ?? undefined;
  } else {
    submission =
      (await repo.insertSubmission(context.db, {
        caseId: caseRecord.id,
        companyId,
        agencyId: template.agencyId,
        submittedByUserId,
        status: "queued",
        snapshot,
        cleanlinessTier: cleanliness.tier,
        cleanlinessScore: cleanliness.score,
        submittedAt: now,
      })) ?? undefined;
    created = true;
  }

  if (!submission) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create submission" });
  }

  await linkSubmissionDocuments(
    context,
    submission.id,
    snapshotParts.documentRows,
    submittedByUserId,
  );

  await emitSubmissionEvent(context, {
    submissionId: submission.id,
    companyId,
    actorUserId: submittedByUserId,
    action: created ? "submission.created" : "submission.updated",
    summary: created
      ? `Submission created for ${template.nameFr}`
      : `Submission refreshed for ${template.nameFr}`,
    data: {
      caseId: caseRecord.id,
      agencyId: template.agencyId,
      cleanlinessScore: cleanliness.score,
      cleanlinessTier: cleanliness.tier,
    },
  });

  return {
    submission,
    submissionId: submission.id,
    companyId,
    readiness,
    cleanliness,
    created,
  };
}

export async function listMySubmissions(context: Context) {
  const user = requireUser(context);
  const rows = await repo.listMySubmissions(context.db, user.id);

  return rows.map((row) => ({
    ...row.submission,
    company: {
      id: row.submission.companyId,
      legalName: row.companyLegalName,
      legalNameAr: row.companyLegalNameAr,
      tradeName: row.companyTradeName,
      uniqueIdentifier: row.companyUniqueIdentifier,
    },
    agency: {
      id: row.submission.agencyId,
      nameFr: row.agencyNameFr,
      nameAr: row.agencyNameAr,
    },
  }));
}

export async function listCompanySubmissions(
  context: Context,
  input: { companyId: string; status?: SubmissionStatus; limit?: number },
) {
  const rows = await repo.listCompanySubmissions(context.db, input);

  return rows.map((row) => ({
    ...row.submission,
    company: {
      id: row.submission.companyId,
      legalName: row.companyLegalName,
      legalNameAr: row.companyLegalNameAr,
      tradeName: row.companyTradeName,
    },
    agency: {
      id: row.submission.agencyId,
      nameFr: row.agencyNameFr,
      nameAr: row.agencyNameAr,
    },
  }));
}

async function requireCompanySubmission(
  context: Context,
  input: { companyId: string; submissionId: string },
): Promise<Submission> {
  const submission = await repo.findCompanySubmission(
    context.db,
    input.companyId,
    input.submissionId,
  );
  if (!submission) {
    throw new ORPCError("NOT_FOUND", { message: "Submission not found" });
  }
  return submission;
}

export async function listFindingsForSubmission(
  context: Context,
  submission: Pick<Submission, "id" | "caseId">,
): Promise<Finding[]> {
  const direct = await listFindings(context, {
    subject: { type: "submission", id: submission.id },
  });
  if (direct.length > 0 || !submission.caseId) {
    return direct;
  }
  return listFindings(context, { subject: { type: "case", id: submission.caseId } });
}

export async function getCompanySubmission(
  context: Context,
  input: { companyId: string; submissionId: string },
) {
  const submission = await requireCompanySubmission(context, input);
  const [company, agency, documentRows, findingRows, reviewRows, activityRows] = await Promise.all([
    repo.findCompanyById(context.db, submission.companyId),
    repo.findAgencyById(context.db, submission.agencyId),
    repo.listSubmissionDocuments(context.db, submission.id),
    listFindingsForSubmission(context, submission),
    repo.listSubmissionReviews(context.db, submission.id),
    repo.listSubmissionActivity(context.db, submission.id),
  ]);

  return {
    submission,
    company,
    agency,
    documents: documentRows,
    findings: findingRows,
    reviews: reviewRows,
    activity: activityRows,
  };
}

export async function resubmitSubmission(
  context: Context,
  input: { companyId: string; submissionId: string; acknowledgeBlockers?: boolean },
) {
  const submission = await requireCompanySubmission(context, input);
  if (submission.status !== "rejected" && submission.status !== "returned") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Only rejected or returned submissions can be resubmitted",
      data: { status: submission.status },
    });
  }

  let missingDocumentCount = 0;
  let findingRows: Finding[] = [];
  let readiness: SubmissionReadiness = {
    ready: true,
    hasRun: false,
    blockingCount: 0,
    blockers: [],
  };

  if (submission.caseId) {
    const caseRecord = await loadCaseOrThrow(context, submission.caseId);
    const template = await loadTemplateOrThrow(context, caseRecord.templateId);
    [missingDocumentCount, findingRows, readiness] = await Promise.all([
      countMissingRequiredDocuments(context, caseRecord.id, template.id),
      loadFindingsForCase(context, caseRecord.id),
      getSubmissionReadiness(context, { type: "case", id: caseRecord.id }),
    ]);
  }

  if (!readiness.ready && !input.acknowledgeBlockers) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Blocking findings must be acknowledged before resubmitting",
      data: { blockingCount: readiness.blockingCount, blockers: readiness.blockers },
    });
  }

  const cleanliness = computeCleanliness({ findings: findingRows, missingDocumentCount });
  const now = new Date();
  const snapshot = isRecord(submission.snapshot)
    ? { ...submission.snapshot, cleanliness }
    : {
        generatedAt: now.toISOString(),
        fields: [],
        documents: [],
        cleanliness,
      };

  const updated = await repo.updateSubmission(context.db, submission.id, {
    status: "queued",
    submittedAt: now,
    decidedAt: null,
    snapshot,
    cleanlinessTier: cleanliness.tier,
    cleanlinessScore: cleanliness.score,
  });

  await emitSubmissionEvent(context, {
    submissionId: submission.id,
    companyId: submission.companyId,
    action: "submission.resubmitted",
    summary: "Submission resubmitted for review",
    data: { cleanlinessTier: cleanliness.tier, cleanlinessScore: cleanliness.score },
  });

  return { submission: updated ?? submission, readiness, cleanliness };
}

export async function presignSubmissionDocument(
  context: Context,
  input: { documentVersionId: string; companyId?: string; agencyId?: string },
) {
  const row = await repo.findDocumentVersionWithDocument(context.db, input.documentVersionId);
  if (!row || !row.version) {
    throw new ORPCError("NOT_FOUND", { message: "Document version not found" });
  }

  if (input.agencyId) {
    const link = await repo.findAgencyDocumentLink(
      context.db,
      input.documentVersionId,
      input.agencyId,
    );
    if (!link) {
      throw new ORPCError("NOT_FOUND", { message: "Document not linked to this agency" });
    }
  } else if (input.companyId) {
    if (row.document?.companyId && row.document.companyId !== input.companyId) {
      throw new ORPCError("NOT_FOUND", { message: "Document not found for this company" });
    }
    if (!row.document?.companyId && row.document?.caseId) {
      const caseRow = await repo.findCaseById(context.db, row.document.caseId);
      if (caseRow?.companyId !== input.companyId) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found for this company" });
      }
    }
  }

  const url = await context.storage.presignGet(row.version.storagePath, {
    downloadName: row.version.fileName,
  });

  return {
    url,
    fileName: row.version.fileName,
    mimeType: row.version.mimeType,
    size: row.version.size,
  };
}

/* Officer-side submission access */

export async function listMyAgencies(context: Context) {
  const user = requireUser(context);

  if (await isMinistryAgent(context, user.id)) {
    const [allAgencies, memberships] = await Promise.all([
      repo.listAllActiveAgencies(context.db),
      repo.listMyAgencies(context.db, user.id),
    ]);
    const roleByAgency = new Map(memberships.map((row) => [row.agency.id, row.role]));
    return allAgencies.map((agency) => ({
      ...agency,
      role: roleByAgency.get(agency.id) ?? "admin",
    }));
  }

  const rows = await repo.listMyAgencies(context.db, user.id);
  return rows.map((row) => ({ ...row.agency, role: row.role }));
}

export type QueueInput = {
  agencyId: string;
  status?: SubmissionStatus;
  tier?: CleanlinessTier;
  sort?: "cleanliness" | "submittedAt";
  limit?: number;
  cursor?: string;
};

export async function listOfficerQueue(context: Context, input: QueueInput) {
  const limit = input.limit ?? 25;
  const offset = decodeCursor(input.cursor);

  const rows = await repo.listOfficerQueue(context.db, {
    agencyId: input.agencyId,
    status: input.status,
    tier: input.tier,
    sort: input.sort,
    limit,
    offset,
  });

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const now = Date.now();

  return {
    items: page.map((row) => {
      const cleanliness = readCleanlinessSnapshot(row.submission);
      const findingsCount = cleanliness
        ? cleanliness.counts.info +
          cleanliness.counts.warning +
          cleanliness.counts.error +
          cleanliness.counts.blocker
        : 0;
      const blockers = cleanliness?.counts.blocker ?? 0;
      const submittedAt = row.submission.submittedAt;
      const ageDays = submittedAt
        ? Math.max(Math.floor((now - submittedAt.getTime()) / 86_400_000), 0)
        : null;
      return {
        id: row.submission.id,
        caseId: row.submission.caseId,
        status: row.submission.status,
        cleanlinessTier: row.submission.cleanlinessTier,
        cleanlinessScore: row.submission.cleanlinessScore,
        cleanliness,
        submittedAt,
        createdAt: row.submission.createdAt,
        ageDays,
        findingsCount,
        blockers,
        agencyId: row.submission.agencyId,
        company: {
          id: row.submission.companyId,
          legalName: row.companyLegalName,
          legalNameAr: row.companyLegalNameAr,
          tradeName: row.companyTradeName,
          uniqueIdentifier: row.companyUniqueIdentifier,
        },
      };
    }),
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
  };
}

async function requireAgencySubmission(
  context: Context,
  input: { agencyId: string; submissionId: string },
): Promise<Submission> {
  const submission = await repo.findAgencySubmission(
    context.db,
    input.agencyId,
    input.submissionId,
  );
  if (!submission) {
    throw new ORPCError("NOT_FOUND", { message: "Submission not found" });
  }
  return submission;
}

export async function buildCompanyPatterns(context: Context, agencyId: string, companyId: string) {
  const rows = await repo.listSubmissionsByAgencyCompany(context.db, agencyId, companyId);

  const findingCounts = new Map<string, number>();
  for (const submission of rows) {
    const findingRows = await listFindingsForSubmission(context, submission);
    for (const finding of findingRows) {
      findingCounts.set(finding.code, (findingCounts.get(finding.code) ?? 0) + 1);
    }
  }

  const submissionIds = rows.map((row) => row.id);
  const rejectionCounts = new Map<string, number>();
  if (submissionIds.length > 0) {
    const reviewRows = await repo.listReviewsForSubmissions(context.db, submissionIds);
    for (const review of reviewRows) {
      if (review.decision !== "reject" && review.decision !== "return_for_correction") {
        continue;
      }
      const reason = review.reason?.trim();
      if (!reason) {
        continue;
      }
      rejectionCounts.set(reason, (rejectionCounts.get(reason) ?? 0) + 1);
    }
  }

  return {
    submissionCount: rows.length,
    commonFindings: [...findingCounts.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    commonRejectionReasons: [...rejectionCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

export async function getOfficerSubmission(
  context: Context,
  input: { agencyId: string; submissionId: string },
) {
  const submission = await requireAgencySubmission(context, input);
  const [company, agency, documentRows, findingRows, reviewRows, activityRows, patterns] =
    await Promise.all([
      repo.findCompanyById(context.db, submission.companyId),
      repo.findAgencyById(context.db, submission.agencyId),
      repo.listSubmissionDocuments(context.db, submission.id),
      listFindingsForSubmission(context, submission),
      repo.listSubmissionReviews(context.db, submission.id),
      repo.listSubmissionActivity(context.db, submission.id),
      buildCompanyPatterns(context, input.agencyId, submission.companyId),
    ]);

  return {
    submission,
    company,
    agency,
    documents: documentRows,
    findings: findingRows,
    reviews: reviewRows,
    activity: activityRows,
    patterns,
  };
}

export type DecisionInput = {
  agencyId: string;
  submissionId: string;
  decision: "approve" | "reject" | "return_for_correction" | "escalate";
  reason: string;
  notes?: string;
};

const DECISION_STATUS: Record<DecisionInput["decision"], SubmissionStatus> = {
  approve: "approved",
  reject: "rejected",
  return_for_correction: "returned",
  escalate: "escalated",
};

export async function decideSubmission(context: Context, input: DecisionInput) {
  const user = requireUser(context);
  const submission = await requireAgencySubmission(context, input);

  const now = new Date();
  const review = await repo.insertReview(context.db, {
    submissionId: submission.id,
    officerUserId: user.id,
    decision: input.decision,
    reason: input.reason,
    notes: input.notes ?? null,
    decidedAt: now,
  });

  const status = DECISION_STATUS[input.decision];
  const updated = await repo.updateSubmission(context.db, submission.id, {
    status,
    decidedAt: now,
  });

  await emitSubmissionEvent(context, {
    submissionId: submission.id,
    companyId: submission.companyId,
    actorType: "officer",
    action: `submission.review.${input.decision}`,
    summary: `Officer decision: ${input.decision}`,
    data: { decision: input.decision, status, reviewId: review?.id ?? null },
  });

  if (submission.submittedByUserId) {
    await insertNotification(context.db, {
      userId: submission.submittedByUserId,
      companyId: submission.companyId,
      type: "review_decision",
      title: `Submission ${status}`,
      body: input.reason,
      entityType: "submission",
      entityId: submission.id,
    });
  }

  return { submission: updated ?? submission, review: review ?? null };
}
