import { sameValue } from "../compare";
import type { ComparedRef, FindingDraft, RuleDefinition } from "../types";

export const personNationalIdMismatch: RuleDefinition = {
  id: "person_national_id_mismatch",
  version: "1.0.0",
  appliesTo: ["company", "case", "submission"],
  evaluate: (ctx) => {
    const expected = ctx.person?.nationalId ?? null;
    const extracted = ctx.extracted.nationalId;
    if (expected === null || !extracted || sameValue(expected, extracted.value)) {
      return [];
    }

    const refs: ComparedRef[] = [
      {
        kind: "db",
        source: "persons",
        field: "nationalId",
        labelKey: "checks.fields.nationalId",
        ref: ctx.person?.id ?? null,
        value: expected,
      },
      {
        kind: "extracted",
        source: extracted.source,
        field: "nationalId",
        labelKey: "checks.fields.nationalId",
        ref: extracted.ref ?? null,
        documentVersionId: extracted.documentVersionId ?? null,
        value: extracted.value,
      },
    ];

    const draft: FindingDraft = {
      code: "person_national_id_mismatch",
      severity: "error",
      params: { expected, actual: extracted.value },
      refs,
    };

    return [draft];
  },
};
