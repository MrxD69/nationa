import { parseDate } from "../compare";
import type { ComparedRef, FindingDraft, RuleDefinition } from "../types";

const MAX_AGE_MONTHS = 12;

function monthsAgo(now: Date, months: number): Date {
  const date = new Date(now.getTime());
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}

export const beneficialOwnerDeclarationOutdated: RuleDefinition = {
  id: "beneficial_owner_declaration_outdated",
  version: "1.0.0",
  appliesTo: ["company", "case", "submission"],
  evaluate: (ctx) => {
    const company = ctx.company;
    if (!company || company.registryState !== "actif") {
      return [];
    }

    const lastDate = company.lastBeneficialDeclarationDate;
    const parsed = parseDate(lastDate);
    const isOutdated =
      lastDate === null ||
      parsed === null ||
      parsed.getTime() < monthsAgo(ctx.now, MAX_AGE_MONTHS).getTime();
    if (!isOutdated) {
      return [];
    }

    const refs: ComparedRef[] = [
      {
        kind: "db",
        source: "companies",
        field: "lastBeneficialDeclarationDate",
        value: lastDate,
      },
    ];

    const draft: FindingDraft = {
      code: "beneficial_owner_declaration_outdated",
      severity: "error",
      params: {
        months: String(MAX_AGE_MONTHS),
        lastDate: lastDate ?? "—",
      },
      refs,
    };

    return [draft];
  },
};
