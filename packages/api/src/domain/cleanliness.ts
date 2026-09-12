export const SEVERITY_PENALTY: Record<CleanlinessSeverity, number> = {
  info: 0,
  warning: 5,
  error: 15,
  blocker: 40,
};

export const MISSING_DOC_PENALTY = 20;

export type CleanlinessSeverity = "info" | "warning" | "error" | "blocker";

export type CleanlinessTier = "clean" | "minor_concern" | "needs_review";

export type CleanlinessFinding = {
  severity: CleanlinessSeverity;
  status: string;
};

export type CleanlinessCounts = Record<CleanlinessSeverity, number> & { total: number };

export type CleanlinessBreakdown = {
  score: string;
  tier: CleanlinessTier;
  penalty: number;
  severityPenalty: number;
  missingDocumentsPenalty: number;
  missingDocumentCount: number;
  counts: CleanlinessCounts;
};

export const CLEANLINESS_TIER_RANK: Record<CleanlinessTier, number> = {
  clean: 0,
  minor_concern: 1,
  needs_review: 2,
};

const OPEN_STATUSES = new Set(["open", "acknowledged"]);

/**
 * Computes a deterministic cleanliness score/tier for a submission. Only
 * `open` and `acknowledged` findings count towards the penalty. Missing
 * required documents are penalised individually.
 */
export function computeCleanliness(input: {
  findings: CleanlinessFinding[];
  missingDocumentCount?: number;
}): CleanlinessBreakdown {
  const counts: CleanlinessCounts = { info: 0, warning: 0, error: 0, blocker: 0, total: 0 };
  let severityPenalty = 0;

  for (const finding of input.findings) {
    if (!OPEN_STATUSES.has(finding.status)) {
      continue;
    }
    if (finding.severity in SEVERITY_PENALTY) {
      counts[finding.severity] += 1;
      counts.total += 1;
      severityPenalty += SEVERITY_PENALTY[finding.severity];
    }
  }

  const missingDocumentCount = Math.max(input.missingDocumentCount ?? 0, 0);
  const missingDocumentsPenalty = missingDocumentCount * MISSING_DOC_PENALTY;
  const penalty = severityPenalty + missingDocumentsPenalty;
  const score = Math.min(Math.max(100 - penalty, 0), 100).toFixed(2);

  let tier: CleanlinessTier = "clean";
  if (counts.blocker > 0 || missingDocumentCount > 0) {
    tier = "needs_review";
  } else if (counts.warning > 0 || counts.error > 0) {
    tier = "minor_concern";
  }

  return {
    score,
    tier,
    penalty,
    severityPenalty,
    missingDocumentsPenalty,
    missingDocumentCount,
    counts,
  };
}
