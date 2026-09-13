import { parseDate } from "../compare";
import type { ComparedRef, FindingDraft, RuleDefinition } from "../types";

const MAX_AGE_MONTHS = 12;

function monthsAgo(now: Date, months: number): Date {
  const date = new Date(now.getTime());
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}

export const financialStatementsOverdue: RuleDefinition = {
  id: "financial_statements_overdue",
  version: "1.0.0",
  appliesTo: ["company", "case", "submission"],
  evaluate: (ctx) => {
    const company = ctx.company;
    if (!company || company.registryState !== "actif") {
      return [];
    }

    const lastDate = company.lastFinancialStatementsDate;
    const parsed = parseDate(lastDate);
    const isOverdue =
      lastDate === null ||
      parsed === null ||
      parsed.getTime() < monthsAgo(ctx.now, MAX_AGE_MONTHS).getTime();
    if (!isOverdue) {
      return [];
    }

    const refs: ComparedRef[] = [
      {
        kind: "db",
        source: "companies",
        field: "lastFinancialStatementsDate",
        value: lastDate,
      },
    ];

    const draft: FindingDraft = {
      code: "financial_statements_overdue",
      severity: "warning",
      params: {
        months: String(MAX_AGE_MONTHS),
        lastDate: lastDate ?? "—",
      },
      refs,
    };

    return [draft];
  },
};
