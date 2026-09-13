import { ORPCError } from "@orpc/server";

import type { ActivityEvent, Submission } from "@nationa/db";

import { CLEANLINESS_TIER_RANK, type CleanlinessTier } from "../../domain/cleanliness";
import { computeSla, SLA_BUCKET_ORDER, type SlaBucket } from "../../domain/officer-sla";
import type { Context } from "../context";
import { insertActivityEvent } from "../repositories/activity.repo";
import { insertNotification } from "../repositories/notifications.repo";
import * as repo from "../repositories/officer-ops.repo";
import { findAgencySubmission } from "../repositories/submissions.repo";

// ---------------------------------------------------------------------------
// shared types / helpers
// ---------------------------------------------------------------------------

type QueueRow = Awaited<ReturnType<typeof repo.listAgencyQueue>>[number];

export type DeficiencySeverity = "warning" | "error" | "blocker";

export type DeficiencyChecklistItem = {
  code: string;
  label: string;
  severity: DeficiencySeverity;
};

export type DeficiencyTemplate = {
  id: string;
  decision: "return_for_correction" | "reject";
  labelFr: string;
  labelAr: string;
  reasonFr: string;
  reasonAr: string;
  checklist: Array<{
    code: string;
    labelFr: string;
    labelAr: string;
    severity: DeficiencySeverity;
  }>;
};

export type OpsQueueItem = {
  id: string;
  caseId: string | null;
  status: string;
  cleanlinessTier: string;
  cleanlinessScore: string | number | null;
  submittedAt: string | Date | null;
  createdAt: string | Date;
  ageDays: number;
  ageHours: number;
  dueAt: string | Date | null;
  slaBucket: SlaBucket;
  assigneeUserId: string | null;
  assigneeName: string | null;
  isMine: boolean;
  deficiencyDueAt: string | Date | null;
  findingsCount: number;
  blockers: number;
  company: {
    id: string;
    legalName: string | null;
    legalNameAr: string | null;
    tradeName: string | null;
    uniqueIdentifier: string | null;
  } | null;
};

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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timeOf(value: string | Date | null): number {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
}

function scoreOf(value: string | number | null): number {
  if (value === null) {
    return -1;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : -1;
}

function round1(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 10) / 10;
}

/** Clamp a ratio to [0, 1], rounded to 4 decimals; non-finite becomes 0. */
function rate01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, Math.round(value * 10_000) / 10_000));
}

function tierRankOf(tier: string): number {
  return CLEANLINESS_TIER_RANK[tier as CleanlinessTier] ?? CLEANLINESS_TIER_RANK.needs_review;
}

function sortQueueItems(
  items: OpsQueueItem[],
  sort: "priority" | "submittedAt" | "cleanliness",
): OpsQueueItem[] {
  const copy = [...items];
  if (sort === "submittedAt") {
    copy.sort((a, b) => timeOf(a.submittedAt) - timeOf(b.submittedAt));
  } else if (sort === "cleanliness") {
    copy.sort((a, b) => {
      const tier = tierRankOf(a.cleanlinessTier) - tierRankOf(b.cleanlinessTier);
      if (tier !== 0) {
        return tier;
      }
      return scoreOf(b.cleanlinessScore) - scoreOf(a.cleanlinessScore);
    });
  } else {
    copy.sort((a, b) => {
      const sla = SLA_BUCKET_ORDER[a.slaBucket] - SLA_BUCKET_ORDER[b.slaBucket];
      if (sla !== 0) {
        return sla;
      }
      const tier = tierRankOf(a.cleanlinessTier) - tierRankOf(b.cleanlinessTier);
      if (tier !== 0) {
        return tier;
      }
      return timeOf(a.submittedAt) - timeOf(b.submittedAt);
    });
  }
  return copy;
}

/** Latest event per submission for one action family, given desc(createdAt) rows. */
function latestBySubmission<T>(
  events: ActivityEvent[],
  matches: (action: string) => boolean,
  read: (event: ActivityEvent) => T,
): Map<string, T> {
  const seen = new Set<string>();
  const map = new Map<string, T>();
  for (const event of events) {
    const id = event.entityId;
    if (!id || seen.has(id) || !matches(event.action)) {
      continue;
    }
    seen.add(id);
    map.set(id, read(event));
  }
  return map;
}

/** Enrich a bounded page of queue rows with SLA / assignment / deficiency / findings. */
async function enrichQueueRows(context: Context, rows: QueueRow[]): Promise<OpsQueueItem[]> {
  if (rows.length === 0) {
    return [];
  }

  const submissionIds = rows.map((row) => row.submission.id);
  const caseIds = [
    ...new Set(
      rows
        .map((row) => row.submission.caseId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const [events, findingRows, members] = await Promise.all([
    repo.listAssignmentEvents(context.db, submissionIds),
    repo.listFindingsCountsForSubmissions(context.db, submissionIds, caseIds),
    repo.listAgencyMembersForWorkload(context.db, rows[0]!.submission.agencyId),
  ]);

  const assignmentById = latestBySubmission<string | null>(
    events,
    (action) => action === "submission.assigned" || action === "submission.unassigned",
    (event) => {
      if (event.action !== "submission.assigned") {
        return null;
      }
      const data = asRecord(event.data);
      return typeof data?.assigneeUserId === "string" ? data.assigneeUserId : null;
    },
  );

  const deficiencyById = latestBySubmission<string | null>(
    events,
    (action) =>
      action === "submission.deficiency.issued" || action === "submission.deficiency.resolved",
    (event) => {
      if (event.action !== "submission.deficiency.issued") {
        return null;
      }
      const data = asRecord(event.data);
      return typeof data?.dueAt === "string" ? data.dueAt : null;
    },
  );

  const submissionFindings = new Map<string, { count: number; blockers: number }>();
  const caseFindings = new Map<string, { count: number; blockers: number }>();
  for (const finding of findingRows) {
    if (!finding.subjectId) {
      continue;
    }
    const target = finding.subjectType === "submission" ? submissionFindings : caseFindings;
    const bucket = target.get(finding.subjectId) ?? { count: 0, blockers: 0 };
    bucket.count += 1;
    if (finding.severity === "blocker") {
      bucket.blockers += 1;
    }
    target.set(finding.subjectId, bucket);
  }

  const memberById = new Map(members.map((member) => [member.userId, member] as const));
  const currentUserId = context.user?.id ?? null;
  const now = new Date();

  return rows.map((row) => {
    const submission = row.submission;
    const sla = computeSla({
      submittedAt: submission.submittedAt,
      agencyId: submission.agencyId,
      now,
    });
    const assigneeUserId = assignmentById.get(submission.id) ?? null;
    const member = assigneeUserId ? memberById.get(assigneeUserId) : undefined;
    const subFindings = submissionFindings.get(submission.id);
    const caseFinding = submission.caseId ? caseFindings.get(submission.caseId) : undefined;

    return {
      id: submission.id,
      caseId: submission.caseId,
      status: submission.status,
      cleanlinessTier: submission.cleanlinessTier,
      cleanlinessScore: submission.cleanlinessScore,
      submittedAt: submission.submittedAt,
      createdAt: submission.createdAt,
      ageDays: sla.ageDays,
      ageHours: Math.round(sla.ageHours),
      dueAt: sla.dueAt,
      slaBucket: sla.bucket,
      assigneeUserId,
      assigneeName: member ? (member.displayName ?? member.email ?? null) : null,
      isMine: currentUserId !== null && assigneeUserId === currentUserId,
      deficiencyDueAt: deficiencyById.get(submission.id) ?? null,
      findingsCount: (subFindings?.count ?? 0) + (caseFinding?.count ?? 0),
      blockers: (subFindings?.blockers ?? 0) + (caseFinding?.blockers ?? 0),
      company: row.submission.companyId
        ? {
            id: row.submission.companyId,
            legalName: row.companyLegalName,
            legalNameAr: row.companyLegalNameAr,
            tradeName: row.companyTradeName,
            uniqueIdentifier: row.companyUniqueIdentifier,
          }
        : null,
    };
  });
}

async function requireAgencySubmission(
  context: Context,
  agencyId: string,
  submissionId: string,
): Promise<Submission> {
  const submission = await findAgencySubmission(context.db, agencyId, submissionId);
  if (!submission) {
    throw new ORPCError("NOT_FOUND", { message: "Dossier introuvable" });
  }
  return submission;
}

async function emitSubmissionEvent(
  context: Context,
  input: {
    submissionId: string;
    companyId: string | null;
    action: string;
    summary: string;
    data?: Record<string, unknown> | null;
  },
): Promise<void> {
  await insertActivityEvent(context.db, {
    companyId: input.companyId,
    actorUserId: context.user?.id ?? null,
    actorType: "officer",
    entityType: "submission",
    entityId: input.submissionId,
    action: input.action,
    summary: input.summary,
    data: input.data ?? null,
  });
}

// ---------------------------------------------------------------------------
// queue
// ---------------------------------------------------------------------------

export type OpsQueueInput = {
  agencyId: string;
  status?: Submission["status"];
  tier?: CleanlinessTier;
  slaBucket?: SlaBucket;
  assignment?: "all" | "mine" | "unassigned";
  sort?: "priority" | "submittedAt" | "cleanliness";
  limit?: number;
  cursor?: string;
};

export async function listOpsQueue(context: Context, input: OpsQueueInput) {
  const limit = input.limit ?? 25;
  const offset = decodeCursor(input.cursor);
  const assignment = input.assignment ?? "all";
  const assignmentFiltered = assignment === "mine" || assignment === "unassigned";
  const sort = input.sort ?? "priority";

  const rows = await repo.listAgencyQueue(context.db, {
    agencyId: input.agencyId,
    status: input.status,
    tier: input.tier,
    assignment,
    limit,
    offset,
    userId: context.user?.id,
  });

  const items = await enrichQueueRows(context, rows);

  let filtered = items;
  if (input.slaBucket) {
    filtered = filtered.filter((item) => item.slaBucket === input.slaBucket);
  }
  if (assignment === "mine") {
    filtered = filtered.filter((item) => item.isMine);
  } else if (assignment === "unassigned") {
    filtered = filtered.filter((item) => item.assigneeUserId === null);
  }

  const sorted = sortQueueItems(filtered, sort);
  const page = sorted.slice(0, limit);

  const effectiveFetch = assignmentFiltered ? limit * 3 : limit + 1;
  const hasMore = sorted.length > limit || (assignmentFiltered && rows.length >= effectiveFetch);
  const nextCursor = hasMore
    ? encodeCursor(offset + (assignmentFiltered ? effectiveFetch : limit))
    : null;

  // Counts cover the whole (bounded) agency queue, not just the page.
  const countRows = await repo.listAgencyQueue(context.db, {
    agencyId: input.agencyId,
    status: input.status,
    tier: input.tier,
    assignment: "all",
    limit: 500,
    offset: 0,
    userId: context.user?.id,
  });
  const countItems = await enrichQueueRows(context, countRows);

  const counts = {
    total: countItems.length,
    breached: countItems.filter((item) => item.slaBucket === "breached").length,
    atRisk: countItems.filter((item) => item.slaBucket === "at_risk").length,
    onTime: countItems.filter((item) => item.slaBucket === "on_time").length,
    unassigned: countItems.filter((item) => item.assigneeUserId === null).length,
    mine: countItems.filter((item) => item.isMine).length,
    returned: countItems.filter((item) => item.status === "returned").length,
  };

  return { items: page, nextCursor, counts };
}

// ---------------------------------------------------------------------------
// assignment
// ---------------------------------------------------------------------------

export async function claimSubmission(
  context: Context,
  input: { agencyId: string; submissionId: string; userId: string },
) {
  const submission = await requireAgencySubmission(context, input.agencyId, input.submissionId);
  await emitSubmissionEvent(context, {
    submissionId: submission.id,
    companyId: submission.companyId,
    action: "submission.assigned",
    summary: "Dossier pris en charge",
    data: { assigneeUserId: input.userId },
  });
  return { ok: true as const, assigneeUserId: input.userId };
}

export async function assignSubmission(
  context: Context,
  input: { agencyId: string; submissionId: string; assigneeUserId: string },
) {
  const submission = await requireAgencySubmission(context, input.agencyId, input.submissionId);
  const member = await repo.findActiveAgencyMember(
    context.db,
    input.agencyId,
    input.assigneeUserId,
  );
  if (!member) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Cet utilisateur n'est pas un membre actif de l'agence",
    });
  }
  await emitSubmissionEvent(context, {
    submissionId: submission.id,
    companyId: submission.companyId,
    action: "submission.assigned",
    summary: "Dossier affecté à un agent",
    data: { assigneeUserId: input.assigneeUserId },
  });
  return { ok: true as const, assigneeUserId: input.assigneeUserId };
}

export async function releaseSubmission(
  context: Context,
  input: { agencyId: string; submissionId: string },
) {
  const submission = await requireAgencySubmission(context, input.agencyId, input.submissionId);
  await emitSubmissionEvent(context, {
    submissionId: submission.id,
    companyId: submission.companyId,
    action: "submission.unassigned",
    summary: "Dossier remis en file non affectée",
    data: { assigneeUserId: null },
  });
  return { ok: true as const, assigneeUserId: null };
}

// ---------------------------------------------------------------------------
// team workload
// ---------------------------------------------------------------------------

export async function getTeamWorkload(
  context: Context,
  input: { agencyId: string; from?: string; to?: string },
) {
  const from = parseDate(input.from);
  const to = parseDate(input.to);

  const [members, openRows, decidedRows] = await Promise.all([
    repo.listAgencyMembersForWorkload(context.db, input.agencyId),
    repo.listAgencyQueue(context.db, {
      agencyId: input.agencyId,
      limit: 500,
      offset: 0,
      assignment: "all",
    }),
    repo.listDecidedSubmissionsInRange(context.db, input.agencyId, from, to, 2000),
  ]);

  const openIds = openRows.map((row) => row.submission.id);
  const events = await repo.listAssignmentEvents(context.db, openIds);
  const assignmentById = latestBySubmission<string | null>(
    events,
    (action) => action === "submission.assigned" || action === "submission.unassigned",
    (event) => {
      if (event.action !== "submission.assigned") {
        return null;
      }
      const data = asRecord(event.data);
      return typeof data?.assigneeUserId === "string" ? data.assigneeUserId : null;
    },
  );

  const openCountByUser = new Map<string, number>();
  let unassigned = 0;
  for (const id of openIds) {
    const assignee = assignmentById.get(id) ?? null;
    if (assignee) {
      openCountByUser.set(assignee, (openCountByUser.get(assignee) ?? 0) + 1);
    } else {
      unassigned += 1;
    }
  }

  const submittedAtById = new Map(decidedRows.map((row) => [row.id, row.submittedAt] as const));
  const reviewRows = await repo.listReviewReviewers(
    context.db,
    decidedRows.map((row) => row.id),
  );

  const decidedByUser = new Map<string, { count: number; sumHours: number }>();
  for (const review of reviewRows) {
    const bucket = decidedByUser.get(review.officerUserId) ?? { count: 0, sumHours: 0 };
    bucket.count += 1;
    const submittedAt = submittedAtById.get(review.submissionId);
    if (submittedAt && review.decidedAt) {
      bucket.sumHours += Math.max(
        0,
        (review.decidedAt.getTime() - submittedAt.getTime()) / 3_600_000,
      );
    }
    decidedByUser.set(review.officerUserId, bucket);
  }

  const memberWorkload = members.map((member) => {
    const decided = decidedByUser.get(member.userId);
    return {
      userId: member.userId,
      displayName: member.displayName,
      email: member.email,
      role: member.role,
      openCount: openCountByUser.get(member.userId) ?? 0,
      decidedCount: decided?.count ?? 0,
      avgDecisionHours: decided && decided.count > 0 ? round1(decided.sumHours / decided.count) : 0,
    };
  });

  return {
    members: memberWorkload,
    totals: {
      open: openIds.length,
      unassigned,
      activeOfficers: members.length,
      decided: reviewRows.length,
    },
  };
}

// ---------------------------------------------------------------------------
// analytics
// ---------------------------------------------------------------------------

export async function getOpsAnalytics(
  context: Context,
  input: { agencyId: string; from?: string; to?: string },
) {
  const from = parseDate(input.from);
  const to = parseDate(input.to);

  const [decidedRows, submittedRows, openRows, members] = await Promise.all([
    repo.listDecidedSubmissionsInRange(context.db, input.agencyId, from, to, 2000),
    repo.listAllSubmissionsInRangeForThroughput(context.db, input.agencyId, from, to, 2000),
    repo.listAgencyQueue(context.db, {
      agencyId: input.agencyId,
      limit: 500,
      offset: 0,
      assignment: "all",
    }),
    repo.listAgencyMembersForWorkload(context.db, input.agencyId),
  ]);

  const nameById = new Map(
    members.map((member) => [member.userId, member.displayName ?? member.email ?? null] as const),
  );

  const submittedAtById = new Map(decidedRows.map((row) => [row.id, row.submittedAt] as const));
  const reviewRows = await repo.listReviewReviewers(
    context.db,
    decidedRows.map((row) => row.id),
  );

  const hoursList: number[] = [];
  const perOfficer = new Map<string, { decided: number; sumHours: number }>();
  for (const review of reviewRows) {
    const submittedAt = submittedAtById.get(review.submissionId);
    if (!submittedAt || !review.decidedAt) {
      continue;
    }
    const hours = Math.max(0, (review.decidedAt.getTime() - submittedAt.getTime()) / 3_600_000);
    hoursList.push(hours);
    const bucket = perOfficer.get(review.officerUserId) ?? { decided: 0, sumHours: 0 };
    bucket.decided += 1;
    bucket.sumHours += hours;
    perOfficer.set(review.officerUserId, bucket);
  }

  const sortedHours = [...hoursList].sort((a, b) => a - b);
  const avgHours = hoursList.length
    ? round1(hoursList.reduce((sum, value) => sum + value, 0) / hoursList.length)
    : 0;
  const medianHours = sortedHours.length
    ? round1(
        sortedHours.length % 2 === 1
          ? sortedHours[(sortedHours.length - 1) / 2]!
          : (sortedHours[sortedHours.length / 2 - 1]! + sortedHours[sortedHours.length / 2]!) / 2,
      )
    : 0;

  const buckets = [
    { label: "< 24 h", count: 0 },
    { label: "1-3 j", count: 0 },
    { label: "3-7 j", count: 0 },
    { label: "> 7 j", count: 0 },
  ];
  for (const hours of hoursList) {
    if (hours < 24) {
      buckets[0]!.count += 1;
    } else if (hours < 72) {
      buckets[1]!.count += 1;
    } else if (hours < 168) {
      buckets[2]!.count += 1;
    } else {
      buckets[3]!.count += 1;
    }
  }

  const openItems = await enrichQueueRows(context, openRows);
  const breached = openItems.filter((item) => item.slaBucket === "breached").length;
  const atRisk = openItems.filter((item) => item.slaBucket === "at_risk").length;
  const onTime = openItems.filter((item) => item.slaBucket === "on_time").length;
  const slaTotal = openItems.length;
  const breachRate = slaTotal > 0 ? rate01(breached / slaTotal) : 0;

  const throughputMap = new Map<string, { submitted: number; decided: number }>();
  for (const row of submittedRows) {
    const key = (row.submittedAt ?? row.createdAt).toISOString().slice(0, 10);
    const bucket = throughputMap.get(key) ?? { submitted: 0, decided: 0 };
    bucket.submitted += 1;
    throughputMap.set(key, bucket);
  }
  for (const row of decidedRows) {
    if (!row.decidedAt) {
      continue;
    }
    const key = row.decidedAt.toISOString().slice(0, 10);
    const bucket = throughputMap.get(key) ?? { submitted: 0, decided: 0 };
    bucket.decided += 1;
    throughputMap.set(key, bucket);
  }
  const throughput = [...throughputMap.entries()]
    .map(([date, value]) => ({ date, submitted: value.submitted, decided: value.decided }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const allIds = [
    ...new Set([...openRows.map((row) => row.submission.id), ...decidedRows.map((row) => row.id)]),
  ];
  const events = await repo.listAssignmentEvents(context.db, allIds);

  let issued = 0;
  let resolved = 0;
  const deficiencySeen = new Set<string>();
  const deficiencyLatest = new Map<string, { action: "issued" | "resolved"; dueAt: Date | null }>();
  for (const event of events) {
    if (event.action === "submission.deficiency.issued") {
      issued += 1;
    } else if (event.action === "submission.deficiency.resolved") {
      resolved += 1;
    }
    const id = event.entityId;
    if (
      !id ||
      deficiencySeen.has(id) ||
      (event.action !== "submission.deficiency.issued" &&
        event.action !== "submission.deficiency.resolved")
    ) {
      continue;
    }
    deficiencySeen.add(id);
    if (event.action === "submission.deficiency.resolved") {
      deficiencyLatest.set(id, { action: "resolved", dueAt: null });
    } else {
      const data = asRecord(event.data);
      const parsed = typeof data?.dueAt === "string" ? new Date(data.dueAt) : null;
      deficiencyLatest.set(id, {
        action: "issued",
        dueAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed : null,
      });
    }
  }

  const statusById = new Map<string, string>();
  for (const row of openRows) {
    statusById.set(row.submission.id, row.submission.status);
  }
  for (const row of decidedRows) {
    statusById.set(row.id, row.status);
  }

  const now = new Date();
  let awaitingResponse = 0;
  let overdueResponse = 0;
  for (const [id, latest] of deficiencyLatest.entries()) {
    if (latest.action !== "issued" || statusById.get(id) !== "returned") {
      continue;
    }
    awaitingResponse += 1;
    if (latest.dueAt && latest.dueAt.getTime() < now.getTime()) {
      overdueResponse += 1;
    }
  }

  return {
    decisionTime: { avgHours, medianHours, buckets },
    perOfficer: [...perOfficer.entries()]
      .map(([userId, value]) => ({
        userId,
        name: nameById.get(userId) ?? null,
        decided: value.decided,
        avgHours: value.decided > 0 ? round1(value.sumHours / value.decided) : 0,
      }))
      .sort((a, b) => b.decided - a.decided),
    sla: { breached, atRisk, onTime, breachRate },
    throughput,
    deficiency: { issued, resolved, awaitingResponse, overdueResponse },
  };
}

// ---------------------------------------------------------------------------
// deficiency templates (static, no DB)
// ---------------------------------------------------------------------------

const DEFICIENCY_TEMPLATES: DeficiencyTemplate[] = [
  {
    id: "pieces_manquantes",
    decision: "return_for_correction",
    labelFr: "Pièces justificatives manquantes",
    labelAr: "وثائق مبرِّرة ناقصة",
    reasonFr:
      "Votre dossier est incomplet : certaines pièces obligatoires n'ont pas été fournies. Veuillez compléter votre demande.",
    reasonAr: "ملفكم غير مكتمل: بعض الوثائق الإلزامية لم يتم تقديمها. يُرجى استكمال الطلب.",
    checklist: [
      {
        code: "statuts_signes",
        labelFr: "Statuts signés et datés",
        labelAr: "النظام الأساسي موقّع ومؤرّخ",
        severity: "blocker",
      },
      {
        code: "piece_identite",
        labelFr: "Copie de la pièce d'identité du représentant légal",
        labelAr: "نسخة من بطاقة هوية الممثل القانوني",
        severity: "error",
      },
      {
        code: "justificatif_adresse",
        labelFr: "Justificatif du siège social",
        labelAr: "وثيقة تثبت مقر الشركة الاجتماعية",
        severity: "warning",
      },
    ],
  },
  {
    id: "document_non_conforme",
    decision: "return_for_correction",
    labelFr: "Document non conforme",
    labelAr: "وثيقة غير مطابقة",
    reasonFr:
      "Une ou plusieurs pièces transmises ne respectent pas le format ou les exigences réglementaires.",
    reasonAr: "وثيقة أو أكثر من الوثائق المقدَّمة لا تستوفي الشكل أو الشروط التنظيمية المطلوبة.",
    checklist: [
      {
        code: "scan_illisible",
        labelFr: "Scan illisible ou incomplet",
        labelAr: "نسخة ممسوحة غير واضحة أو غير كاملة",
        severity: "error",
      },
      {
        code: "document_expire",
        labelFr: "Document expiré",
        labelAr: "وثيقة منتهية الصلاحية",
        severity: "blocker",
      },
      {
        code: "signature_absente",
        labelFr: "Signature ou cachet manquant",
        labelAr: "التوقيع أو الختم مفقود",
        severity: "warning",
      },
    ],
  },
  {
    id: "beneficiaire_effectif_absent",
    decision: "return_for_correction",
    labelFr: "Registre des bénéficiaires effectifs absent",
    labelAr: "سجل المستفيدين الفعليين غير متوفر",
    reasonFr: "La déclaration des bénéficiaires effectifs est obligatoire et n'a pas été fournie.",
    reasonAr: "التصريح بالمستفيدين الفعليين إلزامي ولم يتم تقديمه.",
    checklist: [
      {
        code: "rbe_depose",
        labelFr: "Registre des bénéficiaires effectifs déposé",
        labelAr: "سجل المستفيدين الفعليين مودَع",
        severity: "blocker",
      },
      {
        code: "pourcentage_detention",
        labelFr: "Pourcentages de détention renseignés",
        labelAr: "النسب المئوية للملكية مُبيّنة",
        severity: "warning",
      },
    ],
  },
  {
    id: "coherence_siege_adresse",
    decision: "return_for_correction",
    labelFr: "Incohérence du siège social",
    labelAr: "تعارض في بيانات مقر الشركة",
    reasonFr: "L'adresse du siège social déclarée est incohérente avec les documents fournis.",
    reasonAr: "عنوان المقر الاجتماعي المصرَّح به لا يتوافق مع الوثائق المقدَّمة.",
    checklist: [
      {
        code: "rne_vs_statuts",
        labelFr: "Adresse divergente entre le RNE et les statuts",
        labelAr: "تباين العنوان بين السجل الوطني للمؤسسات والنظام الأساسي",
        severity: "error",
      },
      {
        code: "contrat_bail",
        labelFr: "Contrat de bail ou titre de propriété",
        labelAr: "عقد الإيجار أو سند الملكية",
        severity: "warning",
      },
    ],
  },
  {
    id: "refus_motif_fond",
    decision: "reject",
    labelFr: "Refus pour motif de fond",
    labelAr: "رفض لسبب موضوعي",
    reasonFr:
      "La demande ne remplit pas les conditions légales requises pour l'opération demandée.",
    reasonAr: "الطلب لا يستوفي الشروط القانونية المطلوبة للعملية المطلوبة.",
    checklist: [
      {
        code: "capacite_juridique",
        labelFr: "Capacité juridique du demandeur non établie",
        labelAr: "الأهلية القانونية لمقدّم الطلب غير مؤكدة",
        severity: "blocker",
      },
      {
        code: "objet_social",
        labelFr: "Objet social incompatible avec l'activité déclarée",
        labelAr: "الغرض الاجتماعي غير متوافق مع النشاط المصرَّح به",
        severity: "error",
      },
      {
        code: "sanctions_registre",
        labelFr: "Inscription au registre des sanctions",
        labelAr: "التسجيل في سجل العقوبات",
        severity: "blocker",
      },
    ],
  },
];

const DUE_OPTIONS = [7, 15, 30];

export async function getDeficiencyTemplates(_context: Context, _input: { agencyId: string }) {
  return { templates: DEFICIENCY_TEMPLATES, dueOptions: DUE_OPTIONS };
}

// ---------------------------------------------------------------------------
// deficiency notices
// ---------------------------------------------------------------------------

export type IssueDeficiencyInput = {
  agencyId: string;
  submissionId: string;
  decision: "return_for_correction" | "reject";
  reason: string;
  checklist?: DeficiencyChecklistItem[];
  dueAt?: string;
  notes?: string;
};

export async function issueDeficiency(context: Context, input: IssueDeficiencyInput) {
  const officerUserId = context.user?.id;
  if (!officerUserId) {
    throw new ORPCError("UNAUTHORIZED", { message: "Authentification requise" });
  }

  const submission = await requireAgencySubmission(context, input.agencyId, input.submissionId);
  if (submission.status === "approved" || submission.status === "rejected") {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Ce dossier a déjà fait l'objet d'une décision définitive",
    });
  }

  const now = new Date();
  const status = input.decision === "reject" ? "rejected" : "returned";
  const dueAt = input.dueAt ?? null;

  await repo.insertReview(context.db, {
    submissionId: submission.id,
    officerUserId,
    decision: input.decision,
    reason: input.reason,
    notes: input.notes ?? null,
    decidedAt: now,
  });

  await repo.updateSubmission(context.db, submission.id, {
    status,
    decidedAt: now,
    updatedAt: now,
  });

  await emitSubmissionEvent(context, {
    submissionId: submission.id,
    companyId: submission.companyId,
    action: "submission.deficiency.issued",
    summary:
      input.decision === "reject"
        ? "Dossier refusé pour motif de fond"
        : "Correction demandée au demandeur",
    data: { decision: input.decision, dueAt, checklist: input.checklist ?? [] },
  });

  if (submission.submittedByUserId) {
    await insertNotification(context.db, {
      userId: submission.submittedByUserId,
      companyId: submission.companyId,
      type: "submission_status",
      title: input.decision === "reject" ? "Dossier refusé" : "Correction demandée",
      body: input.reason,
      entityType: "submission",
      entityId: submission.id,
    });
  }

  return { ok: true as const, status, dueAt };
}

/**
 * Marks an issued deficiency as resolved once the submission reaches a final
 * decision. Exported so a future approval/rejection flow can call it.
 */
export async function resolveDeficiencyIfNeeded(
  context: Context,
  input: { agencyId: string; submissionId: string },
) {
  const submission = await findAgencySubmission(context.db, input.agencyId, input.submissionId);
  if (!submission) {
    return { ok: false as const, resolved: false as const };
  }
  if (submission.status !== "approved" && submission.status !== "rejected") {
    return { ok: false as const, resolved: false as const };
  }

  const events = await repo.listAssignmentEvents(context.db, [submission.id]);
  const hasIssued = events.some((event) => event.action === "submission.deficiency.issued");
  const hasResolved = events.some((event) => event.action === "submission.deficiency.resolved");
  if (!hasIssued || hasResolved) {
    return { ok: true as const, resolved: false as const };
  }

  await emitSubmissionEvent(context, {
    submissionId: submission.id,
    companyId: submission.companyId,
    action: "submission.deficiency.resolved",
    summary: "Réserve traitée après décision",
    data: { decision: submission.status },
  });

  return { ok: true as const, resolved: true as const };
}
