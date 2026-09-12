import { parseDate } from "../compare";
import type { FindingDraft, RuleDefinition } from "../types";

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }
  return null;
}

function isoDate(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export function resolveDeadlineDate(
  deadlineRule: Record<string, unknown> | null | undefined,
  now: Date,
): string | null {
  if (!deadlineRule || typeof deadlineRule !== "object") {
    return null;
  }

  const type = typeof deadlineRule.type === "string" ? deadlineRule.type : null;
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();

  if (type === "monthly") {
    const day = toInt(deadlineRule.day);
    if (day === null) {
      return null;
    }
    const candidate = new Date(Date.UTC(year, monthIndex, day));
    if (candidate.getTime() > now.getTime()) {
      return isoDate(year, monthIndex - 1, day);
    }
    return isoDate(year, monthIndex, day);
  }

  if (type === "annual") {
    const month = toInt(deadlineRule.month);
    const day = toInt(deadlineRule.day);
    if (month === null || day === null) {
      return null;
    }
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate.getTime() > now.getTime()) {
      return isoDate(year - 1, month - 1, day);
    }
    return isoDate(year, month - 1, day);
  }

  return null;
}

export const obligationDeadlineNotMet: RuleDefinition = {
  id: "obligation_deadline_not_met",
  version: "1.0.0",
  appliesTo: ["company", "case", "submission"],
  evaluate: (ctx) => {
    const drafts: FindingDraft[] = [];

    for (const entry of ctx.obligations) {
      if (!entry.dueDate || entry.hasCompletedFiling) {
        continue;
      }
      const due = parseDate(entry.dueDate);
      if (!due || due.getTime() >= ctx.now.getTime()) {
        continue;
      }

      drafts.push({
        code: "obligation_deadline_not_met",
        severity: "warning",
        params: {
          obligation: entry.obligation.nameFr,
          dueDate: entry.dueDate,
          agency: entry.obligation.agencyId,
        },
        refs: [
          {
            kind: "db",
            source: "obligations",
            field: "deadlineRule",
            labelKey: "checks.fields.deadlineRule",
            ref: entry.obligation.id,
            value: JSON.stringify(entry.obligation.deadlineRule ?? {}),
          },
          {
            kind: "derived",
            source: "filings",
            field: "status",
            labelKey: "checks.fields.filingStatus",
            value: null,
          },
        ],
      });
    }

    return drafts;
  },
};
