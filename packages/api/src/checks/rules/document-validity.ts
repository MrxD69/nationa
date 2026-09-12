import type { FindingDraft, RuleDefinition } from "../types";

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const documentExpired: RuleDefinition = {
  id: "document_expired",
  version: "1.0.0",
  appliesTo: ["company", "case", "submission", "document"],
  evaluate: (ctx) => {
    const drafts: FindingDraft[] = [];

    for (const entry of ctx.documents) {
      const validityDays = entry.documentType?.validityDays;
      if (validityDays === null || validityDays === undefined) {
        continue;
      }
      const uploadedAt = entry.latestVersion?.uploadedAt;
      if (!uploadedAt) {
        continue;
      }

      const expiresAt = addDays(uploadedAt, validityDays);
      if (expiresAt.getTime() >= ctx.now.getTime()) {
        continue;
      }

      const documentTypeName = entry.documentType?.nameFr ?? entry.document.title;
      drafts.push({
        code: "document_expired",
        severity: "error",
        params: {
          documentType: documentTypeName,
          documentTitle: entry.document.title,
          expiredOn: toIsoDate(expiresAt),
          validityDays: String(validityDays),
        },
        refs: [
          {
            kind: "db",
            source: "document_versions",
            field: "uploadedAt",
            labelKey: "checks.fields.uploadedAt",
            ref: entry.latestVersion?.id ?? null,
            documentVersionId: entry.latestVersion?.id ?? null,
            value: uploadedAt.toISOString().slice(0, 10),
          },
          {
            kind: "db",
            source: "document_types",
            field: "validityDays",
            labelKey: "checks.fields.validityDays",
            ref: entry.documentType?.id ?? null,
            value: String(validityDays),
          },
        ],
      });
    }

    return drafts;
  },
};
