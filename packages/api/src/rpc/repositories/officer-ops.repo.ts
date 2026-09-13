import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  activityEvents,
  agencyMemberships,
  checkRuns,
  companies,
  findings,
  profiles,
  reviews,
  submissions,
  type NewReview,
  type NewSubmission,
  type Submission,
} from "@nationa/db";
import { users } from "@nationa/db/schema/users";

import type { Db } from "../context";

/**
 * Statuses that still need officer attention. Used as the default queue scope
 * when the caller does not pin an explicit status.
 */
export const OPS_OPEN_STATUSES = ["queued", "in_review", "escalated", "returned"] as const;

/** Event actions that carry assignment / deficiency state for a submission. */
export const SUBMISSION_OPS_ACTIONS = [
  "submission.assigned",
  "submission.unassigned",
  "submission.deficiency.issued",
  "submission.deficiency.resolved",
] as const;

export type OpsQueueRepoInput = {
  agencyId: string;
  status?: Submission["status"];
  tier?: Submission["cleanlinessTier"];
  assignment?: "all" | "mine" | "unassigned";
  limit: number;
  offset: number;
  userId?: string;
};

/**
 * Queue page. Assignment lives in `activity_events`, so it cannot be filtered
 * in SQL — when an assignment filter is requested we over-fetch (limit * 3)
 * and let the service slice after enrichment.
 */
export async function listAgencyQueue(db: Db, input: OpsQueueRepoInput) {
  const conditions: SQL[] = [
    eq(submissions.agencyId, input.agencyId),
    isNull(submissions.deletedAt),
  ];
  if (input.status) {
    conditions.push(eq(submissions.status, input.status));
  } else {
    conditions.push(inArray(submissions.status, [...OPS_OPEN_STATUSES]));
  }
  if (input.tier) {
    conditions.push(eq(submissions.cleanlinessTier, input.tier));
  }

  const assignmentFiltered = input.assignment === "mine" || input.assignment === "unassigned";
  const fetchLimit = assignmentFiltered ? input.limit * 3 : input.limit + 1;

  return db
    .select({
      submission: submissions,
      companyLegalName: companies.legalName,
      companyLegalNameAr: companies.legalNameAr,
      companyTradeName: companies.tradeName,
      companyUniqueIdentifier: companies.uniqueIdentifier,
    })
    .from(submissions)
    .leftJoin(companies, eq(companies.id, submissions.companyId))
    .where(and(...conditions))
    .orderBy(asc(submissions.submittedAt), asc(submissions.createdAt))
    .limit(fetchLimit)
    .offset(input.offset);
}

/** Latest 2000 assignment/deficiency events for the given submissions. */
export async function listAssignmentEvents(db: Db, submissionIds: string[]) {
  if (submissionIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(activityEvents)
    .where(
      and(
        eq(activityEvents.entityType, "submission"),
        inArray(activityEvents.entityId, submissionIds),
        inArray(activityEvents.action, [...SUBMISSION_OPS_ACTIONS]),
      ),
    )
    .orderBy(desc(activityEvents.createdAt))
    .limit(2000);
}

/** Reviews for a set of submissions (officer decision attribution). */
export async function listReviewReviewers(db: Db, submissionIds: string[]) {
  if (submissionIds.length === 0) {
    return [];
  }
  return db
    .select({
      officerUserId: reviews.officerUserId,
      submissionId: reviews.submissionId,
      decision: reviews.decision,
      decidedAt: reviews.decidedAt,
    })
    .from(reviews)
    .where(inArray(reviews.submissionId, submissionIds))
    .limit(2000);
}

/**
 * Open/acknowledged findings for submission and case check-runs. Returns one
 * row per finding (with its subject) so the service can aggregate counts and
 * blocker counts per submission.
 */
export async function listFindingsCountsForSubmissions(
  db: Db,
  submissionIds: string[],
  caseIds: string[],
) {
  const runConditions: SQL[] = [];
  if (submissionIds.length > 0) {
    runConditions.push(
      and(eq(checkRuns.subjectType, "submission"), inArray(checkRuns.subjectId, submissionIds))!,
    );
  }
  if (caseIds.length > 0) {
    runConditions.push(
      and(eq(checkRuns.subjectType, "case"), inArray(checkRuns.subjectId, caseIds))!,
    );
  }
  if (runConditions.length === 0) {
    return [];
  }

  const runs = await db
    .select({
      id: checkRuns.id,
      subjectType: checkRuns.subjectType,
      subjectId: checkRuns.subjectId,
    })
    .from(checkRuns)
    .where(or(...runConditions));
  if (runs.length === 0) {
    return [];
  }

  return db
    .select({
      checkRunId: findings.checkRunId,
      subjectType: checkRuns.subjectType,
      subjectId: checkRuns.subjectId,
      severity: findings.severity,
      status: findings.status,
    })
    .from(findings)
    .innerJoin(checkRuns, eq(checkRuns.id, findings.checkRunId))
    .where(
      and(
        inArray(
          findings.checkRunId,
          runs.map((run) => run.id),
        ),
        inArray(findings.status, ["open", "acknowledged"]),
      ),
    );
}

/** Distinct companies with at least one (non-deleted) submission to the agency. */
export async function listAgencyCompanies(db: Db, agencyId: string, limit: number) {
  return db
    .selectDistinct({
      id: companies.id,
      legalName: companies.legalName,
      legalNameAr: companies.legalNameAr,
      tradeName: companies.tradeName,
      uniqueIdentifier: companies.uniqueIdentifier,
    })
    .from(submissions)
    .innerJoin(companies, eq(companies.id, submissions.companyId))
    .where(and(eq(submissions.agencyId, agencyId), isNull(submissions.deletedAt)))
    .limit(limit);
}

/** Active agency members joined to their profile display name and user email. */
export async function listAgencyMembersForWorkload(db: Db, agencyId: string) {
  return db
    .select({
      userId: agencyMemberships.userId,
      role: agencyMemberships.role,
      displayName: profiles.displayName,
      email: users.email,
    })
    .from(agencyMemberships)
    .leftJoin(profiles, eq(profiles.userId, agencyMemberships.userId))
    .leftJoin(users, eq(users.id, agencyMemberships.userId))
    .where(and(eq(agencyMemberships.agencyId, agencyId), eq(agencyMemberships.status, "active")));
}

/** Active membership lookup used to validate a manual assignment target. */
export async function findActiveAgencyMember(db: Db, agencyId: string, userId: string) {
  const [row] = await db
    .select({ userId: agencyMemberships.userId, role: agencyMemberships.role })
    .from(agencyMemberships)
    .where(
      and(
        eq(agencyMemberships.agencyId, agencyId),
        eq(agencyMemberships.userId, userId),
        eq(agencyMemberships.status, "active"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Count of submissions still open (awaiting an officer decision). */
export async function countOpenByAgency(db: Db, agencyId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(
      and(
        eq(submissions.agencyId, agencyId),
        isNull(submissions.deletedAt),
        inArray(submissions.status, [...OPS_OPEN_STATUSES]),
      ),
    );
  return row?.count ?? 0;
}

/** Submissions decided inside an optional range, newest decision first. */
export async function listDecidedSubmissionsInRange(
  db: Db,
  agencyId: string,
  from?: Date | null,
  to?: Date | null,
  limit = 2000,
) {
  const conditions: SQL[] = [
    eq(submissions.agencyId, agencyId),
    isNull(submissions.deletedAt),
    isNotNull(submissions.decidedAt),
  ];
  if (from) {
    conditions.push(gte(submissions.decidedAt, from));
  }
  if (to) {
    conditions.push(lte(submissions.decidedAt, to));
  }

  return db
    .select()
    .from(submissions)
    .where(and(...conditions))
    .orderBy(desc(submissions.decidedAt))
    .limit(limit);
}

/** Submissions received inside an optional range, newest submission first. */
export async function listAllSubmissionsInRangeForThroughput(
  db: Db,
  agencyId: string,
  from?: Date | null,
  to?: Date | null,
  limit = 2000,
) {
  const conditions: SQL[] = [
    eq(submissions.agencyId, agencyId),
    isNull(submissions.deletedAt),
    isNotNull(submissions.submittedAt),
  ];
  if (from) {
    conditions.push(gte(submissions.submittedAt, from));
  }
  if (to) {
    conditions.push(lte(submissions.submittedAt, to));
  }

  return db
    .select()
    .from(submissions)
    .where(and(...conditions))
    .orderBy(desc(submissions.submittedAt))
    .limit(limit);
}

/** Local submission mutator (submissions.repo.ts is not ours to edit). */
export async function updateSubmission(
  db: Db,
  submissionId: string,
  values: Partial<NewSubmission>,
) {
  const [row] = await db
    .update(submissions)
    .set(values)
    .where(eq(submissions.id, submissionId))
    .returning();
  return row ?? null;
}

/** Local review insert (used by the deficiency flow). */
export async function insertReview(db: Db, values: NewReview) {
  const [row] = await db.insert(reviews).values(values).returning();
  return row ?? null;
}
