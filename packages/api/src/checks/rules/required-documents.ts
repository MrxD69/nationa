import type { FindingDraft, RuleDefinition } from "../types";

export const requiredDocumentMissing: RuleDefinition = {
  id: "required_document_missing",
  version: "1.0.0",
  appliesTo: ["case", "submission"],
  evaluate: (ctx) => {
    const drafts: FindingDraft[] = [];
    const presentTypeIds = new Set(
      ctx.documents
        .map((entry) => entry.document.documentTypeId)
        .filter((value): value is string => Boolean(value)),
    );

    for (const required of ctx.requiredDocumentTypes) {
      if (required.isOptional || presentTypeIds.has(required.documentTypeId)) {
        continue;
      }
      drafts.push({
        code: "required_document_missing",
        severity: "blocker",
        params: {
          documentType: required.nameFr,
          documentTypeCode: required.code,
        },
        refs: [
          {
            kind: "db",
            source: "procedure_steps",
            field: "requiredDocumentTypeId",
            labelKey: "checks.fields.documentType",
            ref: required.stepId ?? required.documentTypeId,
            value: required.nameFr,
          },
          {
            kind: "derived",
            source: "documents",
            field: "documentTypeId",
            labelKey: "checks.fields.presentDocuments",
            value: null,
          },
        ],
      });
    }

    return drafts;
  },
};
