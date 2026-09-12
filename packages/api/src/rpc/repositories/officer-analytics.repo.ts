import { and, eq, gte, inArray, isNull, lte, type SQL } from "drizzle-orm";

import { reviews, submissions } from "@nationa/db";

import type { Db } from "../context";

type DateRange = { from?: string; to?: string };

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function listAgencySubmissions(db: Db, agencyId: string, range: DateRange) {
  const conditions: SQL[] = [eq(submissions.agencyId, agencyId), isNull(submissions.deletedAt)];
  const from = parseDate(range.from);
  const to = parseDate(range.to);
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
    .limit(1000);
}

export async function listReviewsForSubmissions(db: Db, submissionIds: string[]) {
  if (submissionIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(reviews)
    .where(
      and(
        inArray(reviews.submissionId, submissionIds),
        inArray(reviews.decision, ["reject", "return_for_correction"]),
      ),
    );
}
