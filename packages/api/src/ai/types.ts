import type { Context } from "../context";

export type AssistantLocale = "fr" | "ar" | "en";

export type AssistantRequestBody = {
  messages?: unknown;
  conversationId?: string;
  companyId?: string;
  caseId?: string;
  stepId?: string;
  docgenProposalId?: string;
  locale?: string;
};

export type AssistantToolDeps = {
  ctx: Context;
  userId: string;
  conversationId: string;
  messageId: string;
  companyId: string | null;
  caseId: string | null;
  stepId: string | null;
  docgenProposalId: string | null;
  accessibleCompanyIds: string[];
  locale: AssistantLocale;
};

export type AiFieldWrite = {
  key: string;
  valueText?: string | null;
  valueJsonb?: unknown;
  confidence?: number | null;
  citingKeys?: string[];
  repeatKey?: string;
  itemIndex?: number;
};

export type CaseFieldFill = {
  fieldKey: string;
  label?: string | null;
  valueText?: string | null;
  valueJsonb?: unknown;
  confidence?: number | null;
};

export type CitationPayload = {
  id: string;
  source: string;
  article: string | null;
  titleFr: string | null;
  titleAr: string | null;
  textFr: string | null;
  textAr: string | null;
  url: string | null;
};

export type ConversationMessageView = {
  id: string;
  role: string;
  content: string;
  parts: unknown;
  createdAt: Date;
};
