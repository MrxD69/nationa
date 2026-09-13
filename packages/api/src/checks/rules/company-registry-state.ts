import type { ComparedRef, FindingDraft, RuleDefinition } from "../types";

export const companyRegistryStateInvalid: RuleDefinition = {
  id: "company_registry_state_invalid",
  version: "1.0.0",
  appliesTo: ["company", "case", "submission"],
  evaluate: (ctx) => {
    const company = ctx.company;
    if (!company) {
      return [];
    }

    const registryInvalid =
      company.registryState === "radie" || company.registryState === "suspendu";
    const statusInvalid = company.status === "radiated" || company.status === "suspended";
    if (!registryInvalid && !statusInvalid) {
      return [];
    }

    const state = registryInvalid ? company.registryState : company.status;

    const refs: ComparedRef[] = [
      {
        kind: "db",
        source: "companies",
        field: "registryState",
        value: state,
      },
    ];

    const draft: FindingDraft = {
      code: "company_registry_state_invalid",
      severity: "blocker",
      params: { state },
      refs,
    };

    return [draft];
  },
};
