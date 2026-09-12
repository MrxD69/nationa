import type { ComparedRef, FindingDraft, RuleDefinition } from "../types";

const BENEFICIAL_OWNERSHIP_THRESHOLD = 25;

function isBeneficialOwner(role: string, ownershipPercent: string | null): boolean {
  if (role === "owner") {
    return true;
  }
  if (ownershipPercent === null) {
    return false;
  }
  const parsed = Number(ownershipPercent);
  return Number.isFinite(parsed) && parsed >= BENEFICIAL_OWNERSHIP_THRESHOLD;
}

export const beneficialOwnerDeclarationMissing: RuleDefinition = {
  id: "beneficial_owner_declaration_missing",
  version: "1.0.0",
  appliesTo: ["company", "case", "submission"],
  evaluate: (ctx) => {
    const company = ctx.company;
    if (!company) {
      return [];
    }

    const owners = ctx.beneficialOwners.filter((owner) =>
      isBeneficialOwner(owner.role, owner.ownershipPercent),
    );
    if (owners.length === 0) {
      return [];
    }
    if (company.lastBeneficialDeclarationDate) {
      return [];
    }

    const refs: ComparedRef[] = [
      {
        kind: "db",
        source: "company_persons",
        field: "ownershipPercent",
        labelKey: "checks.fields.beneficialOwners",
        ref: company.id,
        value: owners
          .map((owner) => `${owner.personId}:${owner.ownershipPercent ?? "?"}`)
          .join(", "),
      },
      {
        kind: "db",
        source: "companies",
        field: "lastBeneficialDeclarationDate",
        labelKey: "checks.fields.lastBeneficialDeclarationDate",
        ref: company.id,
        value: null,
      },
    ];

    const draft: FindingDraft = {
      code: "beneficial_owner_declaration_missing",
      severity: "blocker",
      params: {
        companyName: company.legalName,
        ownerCount: String(owners.length),
      },
      refs,
    };

    return [draft];
  },
};
