import { z } from "zod";

import { FIELD_LABELS, normalizeFieldKey, type CanonicalFieldKey } from "./fields";

export const documentKindSchema = z.enum(["rne_extract", "cin", "invoice"]);
export type DocumentKind = z.infer<typeof documentKindSchema>;

export const addressPartsSchema = z.object({
  street: z.string().nullish(),
  building: z.string().nullish(),
  office: z.string().nullish(),
  locality: z.string().nullish(),
  postalCode: z.string().nullish(),
  city: z.string().nullish(),
  governorate: z.string().nullish(),
  country: z.string().nullish(),
});

export const addressSchema = z.object({
  fr: addressPartsSchema.nullish(),
  ar: addressPartsSchema.nullish(),
  raw: z.string().nullish(),
});
export type ExtractionAddress = z.infer<typeof addressSchema>;

const confidenceSchema = z.number().min(0).max(1).nullish();

export const rneManagerSchema = z.object({
  fullName: z.string().nullish(),
  fullNameAr: z.string().nullish(),
  nationality: z.string().nullish(),
  roleLabelRaw: z.string().nullish(),
});
export type RneManager = z.infer<typeof rneManagerSchema>;

export const rneExtractSchema = z.object({
  kind: z.literal("rne_extract"),
  extractNumber: z.string().nullish(),
  editionDate: z.string().nullish(),
  verificationNumber: z.string().nullish(),
  uniqueIdentifier: z.string().nullish(),
  internalManagementNumber: z.string().nullish(),
  registryType: z.string().nullish(),
  legalName: z.string().nullish(),
  legalNameAr: z.string().nullish(),
  tradeName: z.string().nullish(),
  enseigne: z.string().nullish(),
  headquartersAddress: addressSchema.nullish(),
  activityAddress: addressSchema.nullish(),
  legalForm: z.string().nullish(),
  capitalAmount: z.number().nullish(),
  currency: z.string().nullish(),
  durationYears: z.number().int().nullish(),
  publicationDate: z.string().nullish(),
  mainActivityLabel: z.string().nullish(),
  mainActivityLabelAr: z.string().nullish(),
  mainActivityCode: z.string().nullish(),
  activityStartDate: z.string().nullish(),
  registryState: z.string().nullish(),
  secondaryEstablishmentsCount: z.number().int().nullish(),
  leasing: z.boolean().nullish(),
  hasPledge: z.boolean().nullish(),
  fiscalDefault: z.boolean().nullish(),
  mentionDate: z.string().nullish(),
  lastModificationDate: z.string().nullish(),
  lastFinancialStatementsDate: z.string().nullish(),
  lastBeneficialDeclarationDate: z.string().nullish(),
  workforce: z.number().int().nullish(),
  taxId: z.string().nullish(),
  managers: z.array(rneManagerSchema).nullish(),
  confidence: confidenceSchema,
});
export type RneExtractOutput = z.infer<typeof rneExtractSchema>;

export const cinSchema = z.object({
  kind: z.literal("cin"),
  fullName: z.string().nullish(),
  fullNameAr: z.string().nullish(),
  nationalId: z.string().nullish(),
  birthDate: z.string().nullish(),
  nationality: z.string().nullish(),
  sex: z.string().nullish(),
  address: addressSchema.nullish(),
  confidence: confidenceSchema,
});
export type CinOutput = z.infer<typeof cinSchema>;

export const invoiceLineSchema = z.object({
  description: z.string().nullish(),
  quantity: z.number().nullish(),
  unitPrice: z.number().nullish(),
  taxRate: z.number().nullish(),
  taxAmount: z.number().nullish(),
  lineTotal: z.number().nullish(),
});
export type InvoiceLine = z.infer<typeof invoiceLineSchema>;

export const invoiceSchema = z.object({
  kind: z.literal("invoice"),
  supplierName: z.string().nullish(),
  supplierTaxId: z.string().nullish(),
  invoiceNumber: z.string().nullish(),
  issueDate: z.string().nullish(),
  dueDate: z.string().nullish(),
  currency: z.string().nullish(),
  subtotal: z.number().nullish(),
  taxAmount: z.number().nullish(),
  total: z.number().nullish(),
  lines: z.array(invoiceLineSchema).nullish(),
  confidence: confidenceSchema,
});
export type InvoiceOutput = z.infer<typeof invoiceSchema>;

export const extractionOutputSchema = z.discriminatedUnion("kind", [
  rneExtractSchema,
  cinSchema,
  invoiceSchema,
]);
export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;

export const extractionSchemaByKind = {
  rne_extract: rneExtractSchema,
  cin: cinSchema,
  invoice: invoiceSchema,
} as const;

export const extractionSchemaNameByKind: Record<DocumentKind, string> = {
  rne_extract: "RneExtract",
  cin: "CinCard",
  invoice: "SupplierInvoice",
};

const EXTRA_FIELD_ALIASES: Partial<Record<string, CanonicalFieldKey>> = {
  sex: "gender",
};

export function resolveCanonicalFieldKey(raw: string): CanonicalFieldKey | null {
  return normalizeFieldKey(raw) ?? EXTRA_FIELD_ALIASES[raw] ?? null;
}

export type ExtractionFieldScope = "company" | "person" | "invoice";

export type ExtractedFieldDraft = {
  key: string;
  labelRaw: string | null;
  normalizedKey: CanonicalFieldKey | null;
  valueText: string | null;
  valueJsonb: unknown;
  confidence: number | null;
  scope: ExtractionFieldScope;
};

const NON_FIELD_KEYS = new Set(["kind", "confidence"]);

function isScalar(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function scopeForKind(kind: DocumentKind): ExtractionFieldScope {
  if (kind === "cin") {
    return "person";
  }
  if (kind === "invoice") {
    return "invoice";
  }
  return "company";
}

export function mapExtractionToDrafts(output: ExtractionOutput): ExtractedFieldDraft[] {
  const scope = scopeForKind(output.kind);
  const record = output as unknown as Record<string, unknown>;
  const documentConfidence = typeof record.confidence === "number" ? record.confidence : null;
  const drafts: ExtractedFieldDraft[] = [];

  for (const [key, value] of Object.entries(record)) {
    if (NON_FIELD_KEYS.has(key) || value === null || value === undefined) {
      continue;
    }
    const normalizedKey = resolveCanonicalFieldKey(key);
    const label = normalizedKey ? FIELD_LABELS[normalizedKey].fr : null;
    drafts.push({
      key,
      labelRaw: label ?? key,
      normalizedKey,
      valueText: isScalar(value) ? String(value) : null,
      valueJsonb: isScalar(value) ? null : value,
      confidence: documentConfidence,
      scope,
    });
  }

  return drafts;
}

const CIN_HINTS = ["cin", "carte", "identite", "identity", "national_id", "nationalid"];
const INVOICE_HINTS = ["facture", "invoice", "bill"];

export function inferDocumentKind(input: {
  code?: string | null;
  title?: string | null;
  mimeType?: string | null;
}): DocumentKind {
  const haystack = `${input.code ?? ""} ${input.title ?? ""} ${input.mimeType ?? ""}`.toLowerCase();
  if (CIN_HINTS.some((hint) => haystack.includes(hint))) {
    return "cin";
  }
  if (INVOICE_HINTS.some((hint) => haystack.includes(hint))) {
    return "invoice";
  }
  return "rne_extract";
}
