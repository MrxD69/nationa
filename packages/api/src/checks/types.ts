import type {
  Case,
  Company,
  Document,
  DocumentType,
  DocumentVersion,
  Obligation,
  Person,
} from "@nationa/db";

export const RULE_SET_VERSION = "rne-2026.09.1";

export type CheckSubjectType = "case" | "submission" | "company" | "document";

export type FindingSeverity = "info" | "warning" | "error" | "blocker";
export type FindingStatus = "open" | "resolved" | "waived" | "acknowledged";
export type FindingNoteKindValue = "note" | "explanation";

export type CheckSubject = {
  type: CheckSubjectType;
  id: string;
};

export type ComparedRefKind = "db" | "extracted" | "snapshot" | "derived";

export type ComparedRef = {
  kind: ComparedRefKind;
  source: string;
  field?: string | null;
  labelKey?: string | null;
  ref?: string | null;
  documentVersionId?: string | null;
  value: string | null;
};

export type FindingDraft = {
  code: string;
  severity: FindingSeverity;
  params: Record<string, string>;
  refs: ComparedRef[];
};

export type ExtractedValue = {
  value: string;
  fieldKey: string;
  labelKey?: string | null;
  source: string;
  ref?: string | null;
  documentVersionId?: string | null;
};

export type ExtractedValues = Record<string, ExtractedValue | undefined>;

export type CheckDocument = {
  document: Document;
  documentType: DocumentType | null;
  latestVersion: DocumentVersion | null;
};

export type RequiredDocumentType = {
  documentTypeId: string;
  code: string;
  nameFr: string;
  nameAr: string | null;
  isOptional: boolean;
  stepId: string | null;
  stepCode: string | null;
};

export type ObligationContext = {
  obligation: Obligation;
  dueDate: string | null;
  hasCompletedFiling: boolean;
};

export type BeneficialOwner = {
  personId: string;
  role: string;
  ownershipPercent: string | null;
};

export type RuleContext = {
  subject: CheckSubject;
  now: Date;
  company: Company | null;
  person: Person | null;
  case: Case | null;
  documents: CheckDocument[];
  extracted: ExtractedValues;
  requiredDocumentTypes: RequiredDocumentType[];
  obligations: ObligationContext[];
  beneficialOwners: BeneficialOwner[];
};

export type RuleDefinition = {
  id: string;
  version: string;
  appliesTo: CheckSubjectType[];
  evaluate: (ctx: RuleContext) => FindingDraft[];
};
