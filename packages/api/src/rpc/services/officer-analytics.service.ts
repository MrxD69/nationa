import type { Context } from "../context";
import * as repo from "../repositories/officer-analytics.repo";
import {
  buildCompanyPatterns,
  listFindingsForSubmission,
  readCleanlinessSnapshot,
} from "./submissions.service";

type DateRange = { from?: string; to?: string };

function periodKey(value: Date | null): string {
  const date = value ?? new Date();
  return date.toISOString().slice(0, 10);
}

function topEntries(map: Map<string, number>, limit: number) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export async function getCompanyPatterns(
  context: Context,
  input: { agencyId: string; companyId: string },
) {
  return buildCompanyPatterns(context, input.agencyId, input.companyId);
}

export async function getAgencyAnalytics(
  context: Context,
  input: { agencyId: string } & DateRange,
) {
  const agencySubmissions = await repo.listAgencySubmissions(context.db, input.agencyId, input);
  const submissionIds = agencySubmissions.map((submission) => submission.id);

  const findingCounts = new Map<string, number>();
  let caughtByChecks = 0;

  for (const submission of agencySubmissions) {
    const cleanliness = readCleanlinessSnapshot(submission);
    if (cleanliness) {
      caughtByChecks +=
        cleanliness.counts.blocker + cleanliness.counts.error + cleanliness.missingDocumentCount;
    }
    const findingRows = await listFindingsForSubmission(context, submission);
    for (const finding of findingRows) {
      findingCounts.set(finding.code, (findingCounts.get(finding.code) ?? 0) + 1);
    }
  }

  const rejectionCounts = new Map<string, number>();
  if (submissionIds.length > 0) {
    const reviewRows = await repo.listReviewsForSubmissions(context.db, submissionIds);
    for (const review of reviewRows) {
      const reason = review.reason?.trim();
      if (!reason) {
        continue;
      }
      rejectionCounts.set(reason, (rejectionCounts.get(reason) ?? 0) + 1);
    }
  }

  const byTier = { clean: 0, minor_concern: 0, needs_review: 0 };
  const volume = new Map<string, number>();
  const quality = new Map<string, { total: number; sum: number; clean: number }>();

  for (const submission of agencySubmissions) {
    byTier[submission.cleanlinessTier] += 1;

    const key = periodKey(submission.submittedAt ?? submission.createdAt);
    volume.set(key, (volume.get(key) ?? 0) + 1);

    const score = submission.cleanlinessScore ? Number(submission.cleanlinessScore) : 0;
    const bucket = quality.get(key) ?? { total: 0, sum: 0, clean: 0 };
    bucket.total += 1;
    bucket.sum += Number.isFinite(score) ? score : 0;
    if (submission.cleanlinessTier === "clean") {
      bucket.clean += 1;
    }
    quality.set(key, bucket);
  }

  return {
    totals: {
      submissions: agencySubmissions.length,
      byTier,
      estimatedTimeSavedMinutes: byTier.clean * 10 + byTier.minor_concern * 5,
      caughtByChecks,
    },
    patterns: {
      submissionCount: agencySubmissions.length,
      commonFindings: topEntries(findingCounts, 10).map(([code, count]) => ({ code, count })),
      commonRejectionReasons: topEntries(rejectionCounts, 10).map(([reason, count]) => ({
        reason,
        count,
      })),
    },
    volume: [...volume.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    quality: [...quality.entries()]
      .map(([date, bucket]) => ({
        date,
        averageScore: bucket.total > 0 ? Number((bucket.sum / bucket.total).toFixed(2)) : 0,
        cleanRatio: bucket.total > 0 ? Number((bucket.clean / bucket.total).toFixed(2)) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
