import { sameValue } from "../compare";
import type {
  ComparedRef,
  ExtractedValue,
  FindingDraft,
  FindingSeverity,
  RuleDefinition,
} from "../types";

type MismatchInput = {
  code: string;
  severity: FindingSeverity;
  field: string;
  fieldLabel: string;
  expected: string | null;
  extracted: ExtractedValue | undefined;
  companyId: string | null;
};

function mismatchDraft(input: MismatchInput): FindingDraft | null {
  const { expected, extracted } = input;
  if (expected === null || expected === undefined || !extracted) {
    return null;
  }
  if (sameValue(expected, extracted.value)) {
    return null;
  }

  const refs: ComparedRef[] = [
    {
      kind: "db",
      source: "companies",
      field: input.field,
      labelKey: input.fieldLabel,
      ref: input.companyId,
      value: expected,
    },
    {
      kind: "extracted",
      source: extracted.source,
      field: input.field,
      labelKey: input.fieldLabel,
      ref: extracted.ref ?? null,
      documentVersionId: extracted.documentVersionId ?? null,
      value: extracted.value,
    },
  ];

  return {
    code: input.code,
    severity: input.severity,
    params: { expected, actual: extracted.value },
    refs,
  };
}

export const companyNameMismatch: RuleDefinition = {
  id: "company_name_mismatch",
  version: "1.0.0",
  appliesTo: ["company", "case", "submission"],
  evaluate: (ctx) => {
    const extracted = ctx.extracted.legalName;
    const draft = mismatchDraft({
      code: "company_name_mismatch",
      severity: "warning",
      field: "legalName",
      fieldLabel: "checks.fields.legalName",
      expected: ctx.company?.legalName ?? null,
      extracted,
      companyId: ctx.company?.id ?? null,
    });
    return draft ? [draft] : [];
  },
};

export const capitalMismatch: RuleDefinition = {
  id: "capital_mismatch",
  version: "1.0.0",
  appliesTo: ["company", "case", "submission"],
  evaluate: (ctx) => {
    const extracted = ctx.extracted.capitalAmount;
    const draft = mismatchDraft({
      code: "capital_mismatch",
      severity: "error",
      field: "capitalAmount",
      fieldLabel: "checks.fields.capitalAmount",
      expected: ctx.company?.capitalAmount ?? null,
      extracted,
      companyId: ctx.company?.id ?? null,
    });
    return draft ? [draft] : [];
  },
};

export const legalFormMismatch: RuleDefinition = {
  id: "legal_form_mismatch",
  version: "1.0.0",
  appliesTo: ["company", "case", "submission"],
  evaluate: (ctx) => {
    const extracted = ctx.extracted.legalForm;
    const draft = mismatchDraft({
      code: "legal_form_mismatch",
      severity: "warning",
      field: "legalForm",
      fieldLabel: "checks.fields.legalForm",
      expected: ctx.company?.legalForm ?? null,
      extracted,
      companyId: ctx.company?.id ?? null,
    });
    return draft ? [draft] : [];
  },
};
